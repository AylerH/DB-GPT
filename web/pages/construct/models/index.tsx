import { apiInterceptors, getModelDetail, getModelList, startModel, stopModel, testModelConnection } from '@/client/api';
import ModelForm from '@/components/model/model-form';
import BlurredCard, { InnerDropdown } from '@/new-components/common/blurredCard';
import ConstructLayout from '@/new-components/layout/Construct';
import { IModelData } from '@/types/model';
import { getModelIcon } from '@/utils/constants';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Tag, message } from 'antd';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function Models() {
  const { t } = useTranslation();
  const [models, setModels] = useState<Array<IModelData>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<IModelData | null>(null);
  const [editModelDetail, setEditModelDetail] = useState<any>(null);

  async function getModels() {
    const [, res] = await apiInterceptors(getModelList());
    setModels(res ?? []);
  }

  async function loadModelDetailAndEdit(info: IModelData) {
    if (loading) return;
    setLoading(true);
    message.loading({ content: t('loading'), key: 'load_model' });

    const [, res] = await apiInterceptors(getModelDetail(info.model_name, info.worker_type));
    setLoading(false);
    message.destroy('load_model');

    if (res) {
      setEditModelDetail(res);
      setEditingModel(info);
      setIsModalOpen(true);
    } else {
      // Fall back to basic info if detail not found
      setEditModelDetail(null);
      setEditingModel(info);
      setIsModalOpen(true);
    }
  }

  async function testTheModel(info: IModelData) {
    if (loading) return;
    setLoading(true);
    message.loading({ content: t('testing_connection'), key: 'test_connection' });

    // First try to get model detail to get the actual api_url
    const [, modelDetail] = await apiInterceptors(getModelDetail(info.model_name, info.worker_type));
    const apiUrl = modelDetail?.params?.api_url || modelDetail?.params?.api_base || `http://${info.host}:${info.port}`;

    const [, , res] = await apiInterceptors(
      testModelConnection({
        host: info.host,
        port: info.port,
        model: info.model_name,
        worker_type: info.worker_type,
        params: {
          api_url: apiUrl,
          ...modelDetail?.params,
        },
      }),
    );
    setLoading(false);

    if (res?.success) {
      message.success({ content: t('connection_success'), key: 'test_connection' });
    } else {
      message.error({ content: res?.err_msg || t('connection_failed'), key: 'test_connection' });
    }
  }

  async function startTheModel(info: IModelData) {
    if (loading) return;
    const content = t(`confirm_start_model`) + info.model_name;

    showConfirm(t('start_model'), content, async () => {
      setLoading(true);
      const [, , res] = await apiInterceptors(
        startModel({
          host: info.host,
          port: info.port,
          model: info.model_name,
          worker_type: info.worker_type,
          delete_after: false,
          params: {},
        }),
      );
      setLoading(false);
      if (res?.success) {
        message.success(t('start_model_success'));
        await getModels();
      }
    });
  }

  async function stopTheModel(info: IModelData, delete_after = false) {
    if (loading) return;

    const action = delete_after ? 'stop_and_delete' : 'stop';
    const content = t(`confirm_${action}_model`) + info.model_name;
    showConfirm(t(`${action}_model`), content, async () => {
      setLoading(true);
      const [, , res] = await apiInterceptors(
        stopModel({
          host: info.host,
          port: info.port,
          model: info.model_name,
          worker_type: info.worker_type,
          delete_after: delete_after,
          params: {},
        }),
      );
      setLoading(false);
      if (res?.success === true) {
        message.success(t(`${action}_model_success`));
        await getModels();
      }
    });
  }

  const showConfirm = (title: string, content: string, onOk: () => Promise<void>) => {
    Modal.confirm({
      title,
      content,
      onOk: async () => {
        await onOk();
      },
      okButtonProps: {
        className: 'bg-button-gradient',
      },
    });
  };

  useEffect(() => {
    getModels();
  }, []);

  const returnLogo = (name: string) => {
    return getModelIcon(name);
  };

  return (
    <ConstructLayout>
      <div className='px-6 overflow-y-auto'>
        <div className='flex justify-between items-center mb-6'>
          <div className='flex items-center gap-4'>
          </div>

          <div className='flex items-center gap-4'>
            <Button
              className='border-none text-white bg-button-gradient'
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingModel(null);
                setIsModalOpen(true);
              }}
            >
              {t('create_model')}
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap mx-[-8px] '>
          {models.map(item => (
            <BlurredCard
              logo={returnLogo(item.model_name)}
              description={
                <div className='flex flex-col gap-1 relative text-xs bottom-4'>
                  <div className='flex overflow-hidden'>
                    <p className='w-28 text-gray-500 mr-2'>Host:</p>
                    <p className='flex-1 text-ellipsis'>{item.host}</p>
                  </div>
                  <div className='flex overflow-hidden'>
                    <p className='w-28 text-gray-500 mr-2'>Manage Host:</p>
                    <p className='flex-1 text-ellipsis'>
                      {item.manager_host}:{item.manager_port}
                    </p>
                  </div>
                  <div className='flex overflow-hidden'>
                    <p className='w-28 text-gray-500 mr-2'>Last Heart Beat:</p>
                    <p className='flex-1 text-ellipsis'>{moment(item.last_heartbeat).format('YYYY-MM-DD HH:mm:ss')}</p>
                  </div>
                </div>
              }
              name={item.model_name}
              key={item.model_name}
              RightTop={
                <InnerDropdown
                  menu={{
                    items: [
                      {
                        key: 'test_model',
                        label: <span className='text-blue-400'>{t('test_connection')}</span>,
                        onClick: () => testTheModel(item),
                      },
                      {
                        key: 'edit_model',
                        label: <span className='text-yellow-500'>{t('edit_model')}</span>,
                        onClick: () => loadModelDetailAndEdit(item),
                      },
                      {
                        key: 'stop_model',
                        label: <span className='text-red-400'>{t('stop_model')}</span>,
                        onClick: () => stopTheModel(item),
                      },
                      {
                        key: 'start_model',
                        label: <span className='text-green-400'>{t('start_model')}</span>,
                        onClick: () => startTheModel(item),
                      },
                      {
                        key: 'stop_and_delete_model',
                        label: <span className='text-red-400'>{t('stop_and_delete_model')}</span>,
                        onClick: () => stopTheModel(item, true),
                      },
                    ],
                  }}
                />
              }
              rightTopHover={false}
              Tags={
                <div>
                  <Tag color={item.healthy ? 'green' : 'red'}>{item.healthy ? 'Healthy' : 'Unhealthy'}</Tag>
                  <Tag>{item.worker_type}</Tag>
                </div>
              }
            />
          ))}
        </div>
        <Modal
          width={800}
          open={isModalOpen}
          title={editingModel ? t('edit_model') : t('create_model')}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingModel(null);
          }}
          footer={null}
        >
          <ModelForm
            onCancel={() => {
              setIsModalOpen(false);
              setEditingModel(null);
              setEditModelDetail(null);
            }}
            onSuccess={() => {
              setIsModalOpen(false);
              setEditingModel(null);
              setEditModelDetail(null);
              getModels();
            }}
            initialData={editModelDetail}
          />
        </Modal>
      </div>
    </ConstructLayout>
  );
}

export default Models;

