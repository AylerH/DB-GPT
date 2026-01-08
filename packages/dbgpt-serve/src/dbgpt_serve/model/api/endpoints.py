import logging
from functools import cache
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security.http import HTTPAuthorizationCredentials, HTTPBearer

from dbgpt.component import SystemApp
from dbgpt.model.cluster import (
    WorkerManager,
    WorkerManagerFactory,
    WorkerStartupRequest,
)
from dbgpt.model.cluster.controller.controller import BaseModelController
from dbgpt.model.cluster.storage import ModelStorage
from dbgpt.model.parameter import WorkerType
from dbgpt_serve.core import Result
from dbgpt.model.cluster.storage import ModelStorageIdentifier

import httpx
from ..config import SERVE_SERVICE_COMPONENT_NAME, ServeConfig
from ..service.service import Service
from .schemas import ModelResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Add your API endpoints here

global_system_app: Optional[SystemApp] = None


def get_service() -> Service:
    """Get the service instance"""
    return global_system_app.get_component(SERVE_SERVICE_COMPONENT_NAME, Service)


def get_worker_manager() -> WorkerManager:
    """Get the worker manager instance"""
    return WorkerManagerFactory.get_instance(global_system_app).create()


def get_model_controller() -> BaseModelController:
    """Get the model controller instance"""
    return BaseModelController.get_instance(global_system_app)


def get_model_storage() -> ModelStorage:
    """Get the model storage instance"""
    from ..serve import Serve as ModelServe

    model_serve = ModelServe.get_instance(global_system_app)
    # Persistent model storage
    model_storage = ModelStorage(model_serve.model_storage)
    return model_storage


get_bearer_token = HTTPBearer(auto_error=False)


@cache
def _parse_api_keys(api_keys: str) -> List[str]:
    """Parse the string api keys to a list

    Args:
        api_keys (str): The string api keys

    Returns:
        List[str]: The list of api keys
    """
    if not api_keys:
        return []
    return [key.strip() for key in api_keys.split(",")]


async def check_api_key(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(get_bearer_token),
    service: Service = Depends(get_service),
) -> Optional[str]:
    """Check the api key

    If the api key is not set, allow all.

    Your can pass the token in you request header like this:

    .. code-block:: python

        import requests

        client_api_key = "your_api_key"
        headers = {"Authorization": "Bearer " + client_api_key}
        res = requests.get("http://test/hello", headers=headers)
        assert res.status_code == 200

    """
    if service.config.api_keys:
        api_keys = _parse_api_keys(service.config.api_keys)
        if auth is None or (token := auth.credentials) not in api_keys:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "message": "",
                        "type": "invalid_request_error",
                        "param": None,
                        "code": "invalid_api_key",
                    }
                },
            )
        return token
    else:
        # api_keys not set; allow all
        return None


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@router.get("/test_auth", dependencies=[Depends(check_api_key)])
async def test_auth():
    """Test auth endpoint"""
    return {"status": "ok"}


@router.get("/model-types")
async def model_params(worker_manager: WorkerManager = Depends(get_worker_manager)):
    try:
        params = []
        workers = await worker_manager.supported_models()
        for worker in workers:
            for model in worker.models:
                model_dict = model.__dict__
                model_dict["host"] = worker.host
                model_dict["port"] = worker.port
                params.append(model_dict)
        return Result.succ(params)
    except Exception as e:
        return Result.failed(err_code="E000X", msg=f"model stop failed {e}")


@router.get("/models")
async def model_list(controller: BaseModelController = Depends(get_model_controller)):
    try:
        responses = []
        managers = await controller.get_all_instances(
            model_name="WorkerManager@service", healthy_only=True
        )
        manager_map = dict(map(lambda manager: (manager.host, manager), managers))
        models = await controller.get_all_instances()
        for model in models:
            worker_name, worker_type = model.model_name.split("@")
            if worker_type in WorkerType.values():
                manager_host = model.host if manager_map.get(model.host) else ""
                manager_port = (
                    manager_map[model.host].port if manager_map.get(model.host) else -1
                )
                response = ModelResponse(
                    model_name=worker_name,
                    worker_type=worker_type,
                    host=model.host,
                    port=model.port,
                    manager_host=manager_host,
                    manager_port=manager_port,
                    healthy=model.healthy,
                    check_healthy=model.check_healthy,
                    last_heartbeat=model.str_last_heartbeat,
                    prompt_template=model.prompt_template,
                )
                responses.append(response)
        return Result.succ(responses)

    except Exception as e:
        return Result.failed(err_code="E000X", msg=f"model list error {e}")


@router.get("/models/{model_name}")
async def get_model_detail(
    model_name: str,
    worker_type: str,
    model_storage: ModelStorage = Depends(get_model_storage),
):
    """Get model detail from storage."""
    try:
        models = model_storage.query_models(
            model_name=model_name,
            worker_type=worker_type,
            enabled=None,  # Get both enabled and disabled
        )
        if models:
            model = models[0]
            return Result.succ({
                "host": model.host,
                "port": model.port,
                "model": model.model,
                "worker_type": model.worker_type.value,
                "params": model.params,
            })
        
        # Fallback to check environment variables
        import os
        env_model_name = None
        env_api_base = None
        env_api_key = None
        
        if worker_type == "text2vec":
            env_model_name = os.getenv("EMBEDDING_MODEL_NAME")
            # If specific model name matches OR if generic text2vec request and we have global config
            if env_model_name == model_name:
                env_api_base = os.getenv("EMBEDDING_API_BASE") or os.getenv("EMBEDDING_OPENAI_API_BASE")
                env_api_key = os.getenv("EMBEDDING_API_KEY") or os.getenv("EMBEDDING_OPENAI_API_KEY")
            # If no match on name but we have global embedding config, might be worth trying if storage search failed
            if not env_api_base:
                 env_api_base = os.getenv("EMBEDDING_API_BASE") or os.getenv("EMBEDDING_OPENAI_API_BASE")
                 env_api_key = os.getenv("EMBEDDING_API_KEY") or os.getenv("EMBEDDING_OPENAI_API_KEY")
                 
        elif worker_type == "llm":
            # Check LLM_MODEL (might match partially or exact)
            env_llm_models = os.getenv("LLM_MODEL", "").split(",")
            if model_name in env_llm_models:
                 env_api_base = os.getenv("LLM_API_BASE") or os.getenv("OPENAI_API_BASE")
                 env_api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
            
            if not env_api_base:
                 env_api_base = os.getenv("LLM_API_BASE") or os.getenv("OPENAI_API_BASE")
                 env_api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        if env_api_base:
            # Auto-fix localhost for Docker environment
            if ("localhost" in env_api_base or "127.0.0.1" in env_api_base) and os.path.exists("/.dockerenv"):
                env_api_base = env_api_base.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

            # Construct a temporary model response from env vars
            params = {
                "api_url": env_api_base,
                "api_base": env_api_base,
                "api_key": env_api_key,
                "provider": "proxy/openai" # Default to openai proxy for env vars
            }
            # Try to detect provider from URL for better UX
            if "11434" in env_api_base or "ollama" in env_api_base.lower():
                params["provider"] = "proxy/ollama"
            
            return Result.succ({
                "host": "env", # Indicator that it's from env
                "port": 0,
                "model": model_name,
                "worker_type": worker_type,
                "params": params,
            })

        return Result.failed(msg=f"Model {model_name} not found in storage")
    except Exception as e:
        return Result.failed(err_code="E000X", msg=f"get model detail error {e}")


@router.post("/models/stop")
async def model_stop(
    request: WorkerStartupRequest,
    worker_manager: WorkerManager = Depends(get_worker_manager),
    model_storage: ModelStorage = Depends(get_model_storage),
):
    try:
        request.params = {}
        await worker_manager.model_shutdown(request)
        return Result.succ(True)
    except Exception as e:
        if request.delete_after:
            try:
                # Force delete from storage
                identifier = ModelStorageIdentifier(
                    model=request.model,
                    worker_type=request.worker_type.value,
                    sys_code=request.sys_code,
                    user_name=request.user_name,
                )
                model_storage.delete(identifier)
                logger.info(f"Force deleted model from storage: {request.model}")
                return Result.succ(True)
            except Exception as delete_error:
                logger.error(f"Failed to force delete model: {delete_error}")
        
        return Result.failed(err_code="E000X", msg=f"model stop failed {e}")


@router.post("/models/test")
async def model_test(
    request: WorkerStartupRequest,
):
    """Test model connection."""
    import os
    try:
        worker_type = request.worker_type
        params = request.params
        
        # Generic OpenAI Compatible check
        provider = params.get("provider")
        # Check multiple possible field names for API base URL
        api_base = (
            params.get("api_base") 
            or params.get("openai_api_base") 
            or params.get("api_url")
        )
        api_key = params.get("api_key") or params.get("openai_api_key")
        model = request.model
        
        # Fallback to environment variables for .env configured models
        if not api_base:
            if worker_type == WorkerType.TEXT2VEC:
                # Check embedding-related env vars
                api_base = os.getenv("EMBEDDING_API_BASE") or os.getenv("EMBEDDING_OPENAI_API_BASE")
            else:
                # Check LLM-related env vars
                api_base = os.getenv("LLM_API_BASE") or os.getenv("OPENAI_API_BASE")
        
        # Also fallback api_key from environment variables
        if not api_key:
            if worker_type == WorkerType.TEXT2VEC:
                api_key = os.getenv("EMBEDDING_API_KEY") or os.getenv("EMBEDDING_OPENAI_API_KEY")
            else:
                api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        if not api_base:
             return Result.failed(msg="API Base URL is required for testing. Please provide api_url in the form or set environment variables.")

        headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        # Detect if this is Ollama based on the URL
        is_ollama = "11434" in api_base or "ollama" in api_base.lower()
        
        # Test Connection Logic
        async with httpx.AsyncClient() as client:
            if worker_type == WorkerType.TEXT2VEC:
                 # Test Embedding
                 if is_ollama:
                     # Ollama native API: POST /api/embeddings
                     url = api_base.rstrip("/") + "/api/embeddings"
                     payload = {
                         "model": model,
                         "prompt": "test"
                     }
                 else:
                     # OpenAI compatible: POST /v1/embeddings
                     if api_base.endswith("/"):
                         url = f"{api_base}embeddings" 
                     else:
                         url = f"{api_base}/embeddings"
                     payload = {
                         "input": "test",
                         "model": model
                     }
                 try:
                     response = await client.post(url, json=payload, headers=headers, timeout=60)
                 except httpx.TimeoutException:
                     return Result.failed(msg=f"Connection timed out after 60s connecting to {url}")
                 except Exception as err:
                     return Result.failed(msg=f"Connection failed: {str(err)} URL: {url}")
                 
            else:
                 # Test Chat/LLM
                 if is_ollama:
                     # Ollama native API: POST /api/chat
                     url = api_base.rstrip("/") + "/api/chat"
                     payload = {
                         "model": model,
                         "messages": [{"role": "user", "content": "Hi"}],
                         "stream": False
                     }
                 else:
                     # OpenAI compatible: POST /v1/chat/completions  
                     if api_base.endswith("/"):
                         url = f"{api_base}chat/completions" 
                     else:
                         url = f"{api_base}/chat/completions"
                     payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5
                     }
                 try:
                     response = await client.post(url, json=payload, headers=headers, timeout=60)
                 except httpx.TimeoutException:
                     return Result.failed(msg=f"Connection timed out after 60s connecting to {url}")
                 except Exception as err:
                     return Result.failed(msg=f"Connection failed: {str(err)} URL: {url}")

            if response.status_code == 200:
                return Result.succ(True)
            else:
                return Result.failed(msg=f"Connection failed: {response.status_code} {response.text}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Result.failed(err_code="E000X", msg=f"Test connection error: {str(e)}")


@router.post("/models")
async def create_model(
    request: WorkerStartupRequest,
    worker_manager: WorkerManager = Depends(get_worker_manager),
):
    """Create a model.

    Must provide the full information of the model, including the host, port,
    model name, worker type, and params.
    """
    try:
        await worker_manager.model_startup(request)
        return Result.succ(True)
    except Exception as e:
        logger.error(f"model start failed {e}")
        return Result.failed(err_code="E000X", msg=f"model start failed {e}")


@router.post("/models/start")
async def start_model(
    request: WorkerStartupRequest,
    worker_manager: WorkerManager = Depends(get_worker_manager),
    model_storage: ModelStorage = Depends(get_model_storage),
):
    """Start an existing model."""

    try:
        models = model_storage.query_models(
            request.model,
            worker_type=request.worker_type.value,
            user_name=request.user_name,
            sys_code=request.sys_code,
            host=request.host,
            port=request.port,
        )
        if not models:
            return Result.failed(err_code="E000X", msg="model not found")
        if len(models) > 1:
            return Result.failed(err_code="E000X", msg="multiple models found")
        await worker_manager.model_startup(models[0])
        return Result.succ(True)
    except Exception as e:
        logger.error(f"model start failed {e}")
        return Result.failed(err_code="E000X", msg=f"model start failed {e}")


def init_endpoints(system_app: SystemApp, config: ServeConfig) -> None:
    """Initialize the endpoints"""
    global global_system_app
    system_app.register(Service, config=config)
    global_system_app = system_app
