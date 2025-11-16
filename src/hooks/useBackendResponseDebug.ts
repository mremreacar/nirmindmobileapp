import { useEffect, useRef, useState } from 'react';

/**
 * Backend response debug hook
 * Frontend'in backend'den cevabı alıp almadığını takip eder
 */
export const useBackendResponseDebug = (isStreaming: boolean, conversationId: string | null) => {
  const [debugInfo, setDebugInfo] = useState<{
    lastEvent: string | null;
    lastEventTime: number | null;
    eventsReceived: string[];
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'completed';
  }>({
    lastEvent: null,
    lastEventTime: null,
    eventsReceived: [],
    connectionStatus: 'idle'
  });

  const eventLogRef = useRef<Array<{ event: string; timestamp: number; data?: any }>>([]);
  const originalConsoleLog = useRef(console.log);

  useEffect(() => {
    // Console.log'u intercept et - SSE event'lerini yakala
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      
      // SSE event'lerini yakala
      if (message.includes('SSE event:') || 
          message.includes('user_message event') || 
          message.includes('ai_start') || 
          message.includes('ai_chunk') || 
          message.includes('ai_complete') ||
          message.includes('[BackendApiService]') ||
          message.includes('[onUserMessage]') ||
          message.includes('[AI AÇIK]') ||
          message.includes('[AI YAZIYOR]')) {
        
        const eventType = extractEventType(message);
        if (eventType) {
          eventLogRef.current.push({
            event: eventType,
            timestamp: Date.now(),
            data: args
          });
          
          // Son 20 event'i tut
          if (eventLogRef.current.length > 20) {
            eventLogRef.current.shift();
          }
          
          setDebugInfo(prev => ({
            ...prev,
            lastEvent: eventType,
            lastEventTime: Date.now(),
            eventsReceived: [...prev.eventsReceived.slice(-9), eventType]
          }));
        }
      }
      
      // Orijinal console.log'u çağır
      originalConsoleLog.current(...args);
    };

    return () => {
      // Cleanup: Orijinal console.log'u geri yükle
      console.log = originalConsoleLog.current;
    };
  }, []);

  useEffect(() => {
    if (isStreaming) {
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: 'streaming'
      }));
    } else {
      setDebugInfo(prev => ({
        ...prev,
        connectionStatus: prev.connectionStatus === 'streaming' ? 'completed' : 'idle'
      }));
    }
  }, [isStreaming]);

  const getStatusSummary = () => {
    const hasUserMessage = debugInfo.eventsReceived.includes('user_message');
    const hasAIStart = debugInfo.eventsReceived.includes('ai_start');
    const hasAIChunk = debugInfo.eventsReceived.includes('ai_chunk');
    const hasAIComplete = debugInfo.eventsReceived.includes('ai_complete');
    
    return {
      hasUserMessage,
      hasAIStart,
      hasAIChunk,
      hasAIComplete,
      isHealthy: hasUserMessage && hasAIStart && (hasAIChunk || hasAIComplete),
      lastEventAge: debugInfo.lastEventTime ? Date.now() - debugInfo.lastEventTime : null
    };
  };

  const printDebugInfo = () => {
    const summary = getStatusSummary();
    console.log('🔍 [DEBUG] Backend Response Status:', {
      conversationId,
      connectionStatus: debugInfo.connectionStatus,
      lastEvent: debugInfo.lastEvent,
      lastEventTime: debugInfo.lastEventTime ? new Date(debugInfo.lastEventTime).toISOString() : null,
      lastEventAge: summary.lastEventAge ? `${summary.lastEventAge}ms` : null,
      eventsReceived: debugInfo.eventsReceived,
      summary,
      recentEvents: eventLogRef.current.slice(-5)
    });
  };

  return {
    debugInfo,
    getStatusSummary,
    printDebugInfo,
    eventLog: eventLogRef.current
  };
};

/**
 * Console mesajından event type'ı çıkar
 */
function extractEventType(message: string): string | null {
  if (message.includes('user_message')) return 'user_message';
  if (message.includes('ai_start')) return 'ai_start';
  if (message.includes('ai_chunk')) return 'ai_chunk';
  if (message.includes('ai_complete')) return 'ai_complete';
  if (message.includes('error')) return 'error';
  if (message.includes('[onUserMessage]')) return 'user_message';
  if (message.includes('[AI AÇIK]')) return 'ai_start';
  if (message.includes('[AI YAZIYOR]')) return 'ai_chunk';
  return null;
}

