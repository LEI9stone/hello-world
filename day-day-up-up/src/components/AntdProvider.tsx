import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import type { PropsWithChildren } from 'react';

export default function AntdProvider({ children }: PropsWithChildren) {
  return <ConfigProvider locale={zhCN}>{children}</ConfigProvider>;
}
