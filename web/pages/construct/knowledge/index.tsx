import { ChatContext } from '@/app/chat-context';
import { addSpace, apiInterceptors, delSpace, getSpaceConfig, getSpaceList, newDialogue, updateSpace, uploadDocument } from '@/client/api';
import DocPanel from '@/components/knowledge/doc-panel';
import DocTypeForm from '@/components/knowledge/doc-type-form';
import DocUploadForm from '@/components/knowledge/doc-upload-form';
import Segmentation from '@/components/knowledge/segmentation';
import SpaceForm from '@/components/knowledge/space-form';
import BlurredCard, { ChatButton, InnerDropdown } from '@/new-components/common/blurredCard';
import ConstructLayout from '@/new-components/layout/Construct';
import { File, ISpace, IStorage, StepChangeParams } from '@/types/knowledge';
import { EditOutlined, PlusOutlined, ReadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Spin, Steps, Tag } from 'antd';
import classNames from 'classnames';
import { debounce } from 'lodash';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Knowledge = () => {
  const { setCurrentDialogInfo } = useContext(ChatContext);
  const [spaceList, setSpaceList] = useState<Array<ISpace> | null>([]);
  const [isAddShow, setIsAddShow] = useState<boolean>(false);
  const [isPanelShow, setIsPanelShow] = useState<boolean>(false);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [currentSpace, setCurrentSpace] = useState<ISpace>();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [spaceName, setSpaceName] = useState<string>('');
  const [files, setFiles] = useState<Array<File>>([]);
  const [docType, setDocType] = useState<string>('');
  const [addStatus, setAddStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [spaceConfig, setSpaceConfig] = useState<IStorage | null>(null);

  // Edit space state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingSpace, setEditingSpace] = useState<ISpace | null>(null);
  const [editForm] = Form.useForm();

  const { t } = useTranslation();
  const addKnowledgeSteps = [
    { title: t('Knowledge_Space_Config') },
    { title: t('Choose_a_Datasource_type') },
    { title: t('Upload') },
    { title: t('Segmentation') },
  ];
  const router = useRouter();

  async function getSpaces(params?: any) {
    setLoading(true);
    const [_, data] = await apiInterceptors(getSpaceList({ ...params }));
    setLoading(false);
    setSpaceList(data);
  }

  async function getSpaceConfigs() {
    const [_, data] = await apiInterceptors(getSpaceConfig());
    if (!data) return null;
    setSpaceConfig(data.storage);
  }

  useEffect(() => {
    getSpaces();
    getSpaceConfigs();
  }, []);

  const handleChat = async (space: ISpace) => {
    const [_, data] = await apiInterceptors(
      newDialogue({
        chat_mode: 'chat_knowledge',
      }),
    );
    // 知识库对话都默认私有知识库应用下
    if (data?.conv_uid) {
      setCurrentDialogInfo?.({
        chat_scene: data.chat_mode,
        app_code: data.chat_mode,
      });
      localStorage.setItem(
        'cur_dialog_info',
        JSON.stringify({
          chat_scene: data.chat_mode,
          app_code: data.chat_mode,
        }),
      );
      router.push(`/chat?scene=chat_knowledge&id=${data?.conv_uid}&knowledge_id=${space.name}`);
    }
  };
  const handleStepChange = ({ label, spaceName, docType, files }: StepChangeParams) => {
    if (label === 'finish') {
      setIsAddShow(false);
      getSpaces();
      setSpaceName('');
      setDocType('');
      setAddStatus('finish');
      localStorage.removeItem('cur_space_id');
    } else if (label === 'forward') {
      activeStep === 0 && getSpaces();
      setActiveStep(step => step + 1);
    } else {
      setActiveStep(step => step - 1);
    }
    files && setFiles(files);
    spaceName && setSpaceName(spaceName);
    docType && setDocType(docType);
  };

  function onAddDoc(spaceName: string) {
    setSpaceName(spaceName);
    setActiveStep(1);
    setIsAddShow(true);
    setAddStatus('start');
  }
  const showDeleteConfirm = (space: ISpace) => {
    Modal.confirm({
      title: t('Tips'),
      icon: <WarningOutlined />,
      content: `${t('Del_Knowledge_Tips')}?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        await apiInterceptors(delSpace({ name: space?.name }));
        getSpaces();
      },
    });
  };

  const onSearch = async (e: any) => {
    getSpaces({ name: e.target.value });
  };

  // Handle edit space
  const handleEditSpace = (space: ISpace) => {
    setEditingSpace(space);
    editForm.setFieldsValue({
      name: space.name,
      desc: space.desc,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const [, , res] = await apiInterceptors(
        updateSpace({
          id: editingSpace?.id || '',
          name: values.name,
          desc: values.desc,
        })
      );
      if (res?.success) {
        message.success(t('update_success') || 'Update successful');
        setEditModalOpen(false);
        getSpaces();
      } else {
        message.error(res?.err_msg || t('update_failed') || 'Update failed');
      }
    } catch (error) {
      console.error('Update space error:', error);
    }
  };

  const handleFolderImport = async (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportLoading(true);
    const folderMap = new Map<string, File[]>();

    // Group files by top-level folder
    for (const file of files) {
      const pathParts = file.webkitRelativePath.split('/');
      // If file is in a subfolder, use the top-level folder name as space name
      // If file is at root of selection, maybe skip or use a default space?
      // Assuming selection is a root folder containing subfolders -> KBs
      // Or selection IS the KB folder.

      // Let's assume: User selects "Data".
      // Data/Finance/report.pdf -> Space "Finance"
      // Data/HR/policy.pdf -> Space "HR"
      // Data/note.txt -> Space "Data" (root)

      let spaceName = pathParts.length > 1 ? pathParts[0] : 'Default';
      // If user selected "Finance" folder directly: "Finance/report.pdf" -> pathParts[0] is "Finance"

      // Better strategy: Use the immediate parent folder of the file as KB name?
      // But standard is usually Root Folder -> KB Name.
      // If I select "MyKBs", and it has "KB1", "KB2".
      // webkitRelativePath: MyKBs/KB1/file.txt.
      // Then Space Name = KB1.

      // If I select "KB1" directly.
      // webkitRelativePath: KB1/file.txt.
      // Then Space Name = KB1.

      // So taking pathParts[0] seems robust enough for "Folder = KB".

      if (pathParts.length > 0) {
        spaceName = pathParts[0];
      }

      if (!folderMap.has(spaceName)) {
        folderMap.set(spaceName, []);
      }
      folderMap.get(spaceName)?.push(file);
    }

    try {
      for (const [name, spaceFiles] of folderMap) {
        // Create Space
        // Check if space exists first? addSpace might error if exists OR we just catch it.
        // But we assume we want to create if not exists.
        // addSpace API doesn't have "create_if_not_exists" flag? 
        // Let's try to create. 
        try {
          await apiInterceptors(addSpace({
            name: name,
            vector_type: 'Chroma', // Default
            domain_type: 'Normal', // Default
            desc: `Imported from folder ${name}`,
            owner: 'dbgpt'
          }));
        } catch (err) {
          console.log(`Space ${name} might already exist or error:`, err);
          // Verify existence or just proceed to upload
        }

        // Upload files
        for (const file of spaceFiles) {
          const formData = new FormData();
          formData.append('doc_name', file.name);
          formData.append('doc_file', file);
          formData.append('doc_type', 'DOCUMENT');
          try {
            await apiInterceptors(uploadDocument(name, formData));
          } catch (err) {
            console.error(`Failed to upload ${file.name} to ${name}`, err);
          }
        }
      }
      message.success(t('Import_Success'));
      getSpaces();
    } catch (error) {
      console.error(error);
      message.error(t('Import_Failed'));
    } finally {
      setImportLoading(false);
      // Clear input value to allow re-selecting same folder
      e.target.value = '';
    }
  };

  return (
    <ConstructLayout>
      <Spin spinning={loading}>
        <div className='page-body p-4 md:p-6 h-[90vh] overflow-auto'>
          {/* <Button
            type="primary"
            className="flex items-center"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsAddShow(true);
            }}
          >
            Create
          </Button> */}
          <div className='flex justify-between items-center mb-6'>
            <div className='flex items-center gap-4'>
              <Input
                variant='filled'
                prefix={<SearchOutlined />}
                placeholder={t('please_enter_the_keywords')}
                onChange={debounce(onSearch, 300)}
                allowClear
                className='w-[230px] h-[40px] border-1 border-white backdrop-filter backdrop-blur-lg bg-white bg-opacity-30 dark:border-[#6f7f95] dark:bg-[#6f7f95] dark:bg-opacity-60'
              />
            </div>

            <div className='flex items-center gap-4'>
              <Button
                loading={importLoading}
                className='border-none text-white bg-button-gradient'
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.webkitdirectory = true;
                  input.multiple = true;
                  input.onchange = handleFolderImport;
                  input.click();
                }}
              >
                {t('Import_from_Folder')}
              </Button>
              <Button
                className='border-none text-white bg-button-gradient'
                icon={<PlusOutlined />}
                onClick={() => {
                  setIsAddShow(true);
                }}
              >
                {t('create_knowledge')}
              </Button>
            </div>
          </div>
          <div className='flex flex-wrap mt-4 mx-[-8px]'>
            {spaceList?.map((space: ISpace) => (
              <BlurredCard
                onClick={() => {
                  setCurrentSpace(space);
                  setIsPanelShow(true);
                  localStorage.setItem('cur_space_id', JSON.stringify(space.id));
                }}
                description={space.desc}
                name={space.name}
                key={space.id}
                logo={
                  space.domain_type === 'FinancialReport'
                    ? '/models/fin_report.jpg'
                    : space.vector_type === 'KnowledgeGraph'
                      ? '/models/knowledge-graph.png'
                      : space.vector_type === 'FullText'
                        ? '/models/knowledge-full-text.jpg'
                        : '/models/knowledge-default.jpg'
                }
                RightTop={
                  <InnerDropdown
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          label: (
                            <span onClick={(e) => { e.stopPropagation(); handleEditSpace(space); }}>
                              <EditOutlined className='mr-1' />
                              {t('Edit')}
                            </span>
                          ),
                        },
                        {
                          key: 'del',
                          label: (
                            <span className='text-red-400' onClick={() => showDeleteConfirm(space)}>
                              {t('Delete')}
                            </span>
                          ),
                        },
                      ],
                    }}
                  />
                }
                rightTopHover={false}
                Tags={
                  <div className='flex item-center'>
                    <Tag>
                      <span className='flex items-center gap-1'>
                        <ReadOutlined className='mt-[1px]' />
                        {space.docs}
                      </span>
                    </Tag>
                    <Tag>
                      <span className='flex items-center gap-1'>{space.domain_type || 'Normal'}</span>
                    </Tag>
                    {space.vector_type ? (
                      <Tag>
                        <span className='flex items-center gap-1'>{space.vector_type}</span>
                      </Tag>
                    ) : null}
                  </div>
                }
                LeftBottom={
                  <div className='flex gap-2'>
                    <span>{space.owner}</span>
                    <span>•</span>
                    {space?.gmt_modified && <span>{moment(space?.gmt_modified).fromNow() + ' ' + t('update')}</span>}
                  </div>
                }
                RightBottom={
                  <ChatButton
                    text={t('start_chat')}
                    onClick={() => {
                      handleChat(space);
                    }}
                  />
                }
              />
            ))}
          </div>
        </div>
        <Modal
          className='h-5/6 overflow-hidden'
          open={isPanelShow}
          width={'70%'}
          onCancel={() => setIsPanelShow(false)}
          footer={null}
          destroyOnClose={true}
        >
          <DocPanel space={currentSpace!} onAddDoc={onAddDoc} onDeleteDoc={getSpaces} addStatus={addStatus} />
        </Modal>
        <Modal
          title={t('New_knowledge_base')}
          centered
          open={isAddShow}
          destroyOnClose={true}
          onCancel={() => {
            setIsAddShow(false);
          }}
          width={1000}
          afterClose={() => {
            setActiveStep(0);
            getSpaces();
          }}
          footer={null}
        >
          <Steps current={activeStep} items={addKnowledgeSteps} />
          {activeStep === 0 && <SpaceForm handleStepChange={handleStepChange} spaceConfig={spaceConfig} />}
          {activeStep === 1 && <DocTypeForm handleStepChange={handleStepChange} />}
          <DocUploadForm
            className={classNames({ hidden: activeStep !== 2 })}
            spaceName={spaceName}
            docType={docType}
            handleStepChange={handleStepChange}
          />
          {activeStep === 3 && (
            <Segmentation
              spaceName={spaceName}
              docType={docType}
              uploadFiles={files}
              handleStepChange={handleStepChange}
            />
          )}
        </Modal>

        {/* Edit Space Modal */}
        <Modal
          title={t('Knowledge_Space') + ' - ' + t('Edit')}
          open={editModalOpen}
          onOk={handleEditSubmit}
          onCancel={() => setEditModalOpen(false)}
          destroyOnClose
        >
          <Form
            form={editForm}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              label={t('Knowledge_Space_Name')}
              name="name"
              rules={[
                { required: true, message: t('Please_input_the_name') },
                () => ({
                  validator(_, value) {
                    if (/[^\u4e00-\u9fa50-9a-zA-Z_-]/.test(value)) {
                      return Promise.reject(new Error(t('the_name_can_only_contain')));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input placeholder={t('Please_input_the_name')} />
            </Form.Item>
            <Form.Item
              label={t('Description')}
              name="desc"
              rules={[{ required: true, message: t('Please_input_the_description') }]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t('Please_input_the_description')}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Spin>
    </ConstructLayout>
  );
};

export default Knowledge;
