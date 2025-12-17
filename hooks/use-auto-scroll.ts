import { useEffect, useRef } from 'react';

export function useAutoScroll(dependencies: any[] = []) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const scrollToBottom = () => {
    if (scrollRef.current && shouldAutoScroll.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If user is scrolled up more than 100px from bottom, disable auto-scroll
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight <= 100;
    }
  };

  useEffect(() => {
    // Auto-scroll when dependencies change
    scrollToBottom();
  }, dependencies);

  return {
    scrollRef,
    scrollToBottom,
    handleScroll
  };
}