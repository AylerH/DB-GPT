import { apiInterceptors, updateSpace } from '@/client/api';
import { ISpace } from '@/types/knowledge';
import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
    space: ISpace | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SpaceEditModal(props: IProps) {
    const { t } = useTranslation();
    const { space, open, onClose, onSuccess } = props;
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (space && open) {
            form.setFieldsValue({
                name: space.name,
                desc: space.desc,
            });
        }
    }, [space, open, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const [, , res] = await apiInterceptors(
                updateSpace({
                    id: space?.id || '',
                    name: values.name,
                    desc: values.desc,
                })
            );

            setLoading(false);

            if (res?.success) {
                message.success(t('update_success') || 'Update successful');
                onSuccess();
                onClose();
            } else {
                message.error(res?.err_msg || t('update_failed') || 'Update failed');
            }
        } catch (error) {
            setLoading(false);
            console.error('Update space error:', error);
        }
    };

    return (
        <Modal
            title={t('Knowledge_Space') + ' - ' + t('Edit') || 'Edit Knowledge Space'}
            open={open}
            onOk={handleOk}
            onCancel={onClose}
            confirmLoading={loading}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                className="mt-4"
            >
                <Form.Item
                    label={t('Knowledge_Space_Name') || 'Knowledge Space Name'}
                    name="name"
                    rules={[
                        { required: true, message: t('Please_input_the_name') || 'Please input the name' },
                        () => ({
                            validator(_, value) {
                                if (/[^\u4e00-\u9fa50-9a-zA-Z_-]/.test(value)) {
                                    return Promise.reject(new Error(t('the_name_can_only_contain') || 'Name can only contain letters, numbers, Chinese characters, - and _'));
                                }
                                return Promise.resolve();
                            },
                        }),
                    ]}
                >
                    <Input placeholder={t('Please_input_the_name') || 'Please input the name'} />
                </Form.Item>
                <Form.Item
                    label={t('Description') || 'Description'}
                    name="desc"
                    rules={[{ required: true, message: t('Please_input_the_description') || 'Please input the description' }]}
                >
                    <Input.TextArea
                        rows={3}
                        placeholder={t('Please_input_the_description') || 'Please input the description'}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
