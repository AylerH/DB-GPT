# DB-GPT 环境变量配置说明

本文档列出了所有配置文件中使用的环境变量，每个配置文件使用独立的前缀便于区分和管理。

## 通用系统配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DBGPT_LANG` | `zh` / `en` | 系统语言设置 |

## MySQL 数据库配置

用于 `dbgpt-proxy-custom.toml` 和 `dbgpt-proxy-siliconflow-mysql.toml`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MYSQL_HOST` | `127.0.0.1` | MySQL 主机地址 |
| `MYSQL_PORT` | `3306` | MySQL 端口 |
| `MYSQL_DATABASE` | `dbgpt` | 数据库名称 |
| `MYSQL_USER` | `root` | 数据库用户名 |
| `MYSQL_PASSWORD` | `aa123456` | 数据库密码 |

---

## dbgpt-app-config.example.toml

前缀：`APP_CONFIG_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `APP_CONFIG_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `APP_CONFIG_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `APP_CONFIG_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `APP_CONFIG_API_KEY` | - | API 密钥 |
| `APP_CONFIG_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `APP_CONFIG_EMBEDDING_MODEL_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `APP_CONFIG_EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding API URL |

---

## dbgpt-bm25-rag.toml

前缀：`BM25_RAG_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `BM25_RAG_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `BM25_RAG_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `BM25_RAG_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `BM25_RAG_API_KEY` | - | API 密钥 |
| `BM25_RAG_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `BM25_RAG_EMBEDDING_MODEL_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `BM25_RAG_EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding API URL |

---

## dbgpt-cloud-storage.example.toml

前缀：`CLOUD_STORAGE_`

### 云存储配置

| 变量名 | 说明 |
|--------|------|
| `OSS_ACCESS_KEY_ID` | 阿里云 OSS Access Key ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 OSS Access Key Secret |
| `COS_SECRETID` | 腾讯云 COS Secret ID |
| `COS_SECRETKEY` | 腾讯云 COS Secret Key |

### 模型配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CLOUD_STORAGE_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `CLOUD_STORAGE_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `CLOUD_STORAGE_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `CLOUD_STORAGE_API_KEY` | - | API 密钥 |
| `CLOUD_STORAGE_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `CLOUD_STORAGE_EMBEDDING_MODEL_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `CLOUD_STORAGE_EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding API URL |

---

## dbgpt-graphrag.toml

前缀：`GRAPHRAG_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `GRAPHRAG_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `GRAPHRAG_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `GRAPHRAG_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `GRAPHRAG_API_KEY` | - | API 密钥 |
| `GRAPHRAG_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `GRAPHRAG_EMBEDDING_MODEL_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `GRAPHRAG_EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding API URL |

---

## dbgpt-proxy-openai.toml

前缀：`PROXY_OPENAI_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PROXY_OPENAI_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `PROXY_OPENAI_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `PROXY_OPENAI_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `PROXY_OPENAI_API_KEY` | - | API 密钥 |
| `PROXY_OPENAI_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `PROXY_OPENAI_EMBEDDING_MODEL_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `PROXY_OPENAI_EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding API URL |

---

## dbgpt-proxy-custom.toml

前缀：`PROXY_CUSTOM_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PROXY_CUSTOM_LLM_MODEL_NAME` | `gpt-3.5-turbo` | LLM 模型名称 |
| `PROXY_CUSTOM_LLM_MODEL_PROVIDER` | `proxy/openai` | LLM 模型提供商 |
| `PROXY_CUSTOM_API_BASE` | `https://api.openai.com/v1` | API 基础 URL |
| `PROXY_CUSTOM_API_KEY` | - | API 密钥 |
| `PROXY_CUSTOM_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `PROXY_CUSTOM_EMBEDDING_PROVIDER` | `proxy/openai` | Embedding 模型提供商 |
| `PROXY_CUSTOM_EMBEDDING_API_BASE` | `https://api.openai.com/v1` | Embedding API 基础 URL |
| `PROXY_CUSTOM_OLLAMA_API_BASE` | `http://localhost:11434` | Ollama API URL |
| `PROXY_CUSTOM_EMBEDDING_API_KEY` | - | Embedding API 密钥 |

---

## dbgpt-proxy-ollama.toml

前缀：`PROXY_OLLAMA_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PROXY_OLLAMA_LLM_MODEL_NAME` | `deepseek-r1:1.5b` | LLM 模型名称 |
| `PROXY_OLLAMA_LLM_MODEL_PROVIDER` | `proxy/ollama` | LLM 模型提供商 |
| `PROXY_OLLAMA_API_BASE` | `http://localhost:11434` | Ollama API 基础 URL |
| `PROXY_OLLAMA_API_KEY` | (空) | API 密钥（可选） |
| `PROXY_OLLAMA_EMBEDDING_MODEL_NAME` | `bge-m3:latest` | Embedding 模型名称 |
| `PROXY_OLLAMA_EMBEDDING_MODEL_PROVIDER` | `proxy/ollama` | Embedding 模型提供商 |
| `PROXY_OLLAMA_EMBEDDING_API_URL` | `http://localhost:11434` | Embedding API URL |
| `PROXY_OLLAMA_EMBEDDING_API_KEY` | (空) | Embedding API 密钥（可选） |

---

## dbgpt-proxy-aimlapi.toml

前缀：`PROXY_AIMLAPI_`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PROXY_AIMLAPI_LLM_MODEL_NAME` | `gpt-4o` | LLM 模型名称 |
| `PROXY_AIMLAPI_LLM_MODEL_PROVIDER` | `proxy/aimlapi` | LLM 模型提供商 |
| `PROXY_AIMLAPI_API_KEY` | - | API 密钥 |
| `PROXY_AIMLAPI_EMBEDDING_MODEL_NAME` | `text-embedding-3-small` | Embedding 模型名称 |
| `PROXY_AIMLAPI_EMBEDDING_MODEL_PROVIDER` | `proxy/aimlapi` | Embedding 模型提供商 |
| `PROXY_AIMLAPI_EMBEDDING_API_URL` | `https://api.aimlapi.com/v1/embeddings` | Embedding API URL |

---

## 其他服务商配置

以下配置文件使用独立的 API Key 变量：

### dbgpt-proxy-deepseek.toml

使用硬编码配置，如需环境变量支持请参考上述格式修改配置文件。

### dbgpt-proxy-siliconflow.toml / dbgpt-proxy-siliconflow-mysql.toml

| 变量名 | 说明 |
|--------|------|
| `SILICONFLOW_API_KEY` | SiliconFlow API 密钥 |

### dbgpt-proxy-tongyi.toml

| 变量名 | 说明 |
|--------|------|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope API 密钥 |

### dbgpt-proxy-burncloud.toml

| 变量名 | 说明 |
|--------|------|
| `BURNCLOUD_API_KEY` | BurnCloud API 密钥 |

### dbgpt-proxy-infiniai.toml

| 变量名 | 说明 |
|--------|------|
| `INFINIAI_API_KEY` | InfiniAI API 密钥 |

---

## 使用示例

在项目根目录创建 `.env` 文件：

```env
# 使用 dbgpt-proxy-openai.toml 配置时
PROXY_OPENAI_LLM_MODEL_NAME=gpt-4o
PROXY_OPENAI_API_BASE=https://api.openai.com/v1
PROXY_OPENAI_API_KEY=sk-xxxxxxxxxxxxxx

# 使用 dbgpt-proxy-ollama.toml 配置时
PROXY_OLLAMA_LLM_MODEL_NAME=deepseek-r1:1.5b
PROXY_OLLAMA_API_BASE=http://localhost:11434
```

然后启动时指定配置文件，例如：

```bash
dbgpt start webserver --config configs/dbgpt-proxy-openai.toml
```
