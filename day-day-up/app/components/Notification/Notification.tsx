import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import './Notification.css';

export type NotificationPlacement =
  'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight';

export interface NotificationProps {
  /** 受控显示状态；关闭时由父组件设置为 false */
  open: boolean;
  /** 通知内容，由调用方完全决定 */
  children: ReactNode;
  /** 自动关闭或点击关闭按钮时触发 */
  onClose?: () => void;
  /** Portal 容器，缺省渲染到 document.body */
  getContainer?: () => HTMLElement;
  /** 通知弹出位置 */
  placement?: NotificationPlacement;
  /** 自动关闭时间（秒）；0 或 false 表示不自动关闭 */
  duration?: number | false;
  /** 鼠标悬停时是否暂停自动关闭计时 */
  pauseOnHover?: boolean;
  /** 是否显示默认关闭按钮 */
  closable?: boolean;
  /** 自定义外层 class */
  className?: string;
}

const DEFAULT_DURATION = 4.5;
const CLOSE_TRANSITION_MS = 180;

function defaultGetContainer(): HTMLElement {
  return document.body;
}

/**
 * 无头通知组件：只负责 Portal、定位状态和生命周期，视觉主题由调用方提供。
 */
export function Notification({
  open,
  children,
  onClose,
  getContainer = defaultGetContainer,
  placement = 'bottomRight',
  duration = DEFAULT_DURATION,
  pauseOnHover = true,
  closable = true,
  className,
}: NotificationProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [present, setPresent] = useState(open);
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);
  const closeNotifiedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setContainer(getContainer());
  }, [getContainer]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const notifyClose = useCallback(() => {
    clearTimer();
    if (closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    onCloseRef.current?.();
  }, [clearTimer]);

  const scheduleClose = useCallback(
    (milliseconds: number) => {
      clearTimer();
      if (milliseconds <= 0) {
        notifyClose();
        return;
      }
      remainingRef.current = milliseconds;
      startedAtRef.current = Date.now();
      timerRef.current = window.setTimeout(notifyClose, milliseconds);
    },
    [clearTimer, notifyClose],
  );

  useEffect(() => {
    if (open) {
      closeNotifiedRef.current = false;
      setPresent(true);
      setActive(false);
      const frame = window.requestAnimationFrame(() => setActive(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setActive(false);
    const timeout = window.setTimeout(
      () => setPresent(false),
      CLOSE_TRANSITION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    clearTimer();
    remainingRef.current = null;

    const hasDuration =
      duration !== false && duration > 0 && Number.isFinite(duration);
    if (!open || !hasDuration) return;

    const milliseconds = duration * 1000;
    remainingRef.current = milliseconds;
    if (!hoveringRef.current) scheduleClose(milliseconds);

    return clearTimer;
  }, [clearTimer, duration, open, scheduleClose]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleMouseEnter = useCallback(() => {
    hoveringRef.current = true;
    if (!pauseOnHover || timerRef.current === null) return;

    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max((remainingRef.current ?? 0) - elapsed, 0);
    clearTimer();
  }, [clearTimer, pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    hoveringRef.current = false;
    if (
      !pauseOnHover ||
      !open ||
      remainingRef.current === null ||
      duration === false ||
      duration <= 0
    ) {
      return;
    }
    scheduleClose(remainingRef.current);
  }, [duration, open, pauseOnHover, scheduleClose]);

  if (!container || !present) return null;

  return createPortal(
    <div
      aria-live="polite"
      className={['notification', className].filter(Boolean).join(' ')}
      data-notification="true"
      data-placement={placement}
      data-state={active && open ? 'open' : 'closed'}
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {closable && (
        <button
          type="button"
          className="notification-close"
          aria-label="关闭通知"
          onClick={notifyClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>,
    container,
  );
}
