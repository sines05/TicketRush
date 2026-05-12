import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import aiService from '../services/aiService';
import EventCard from './ai/EventCard';
import ActionButtons from './ai/ActionButtons';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Xin chào! Tôi là trợ lý ảo của TicketRush. Tôi có thể giúp gì cho bạn?", sender: 'agent' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text, isSilent = false) => {
    if (!text.trim() || isLoading) return;

    if (!isSilent) {
      const userMessage = { id: Date.now(), text: text.trim(), sender: 'user' };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
    }
    
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(text, threadId);
      
      if (response?.thread_id) {
        setThreadId(response.thread_id);
      }

      const agentMessage = { 
        id: Date.now() + 1, 
        text: response?.reply || "Xin lỗi, tôi không thể trả lời lúc này.", 
        sender: 'agent',
        ui_components: response?.ui_components || []
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = { 
        id: Date.now() + 1, 
        text: "Đã có lỗi xảy ra khi kết nối với máy chủ. Vui lòng thử lại sau.", 
        sender: 'agent',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleAction = (label, value) => {
    handleSendMessage(value || label);
  };

  const renderComponent = (component, index) => {
    switch (component.type) {
      case 'event_card':
        return <EventCard key={index} data={component.data} />;
      case 'action_buttons':
        return <ActionButtons key={index} data={component.data} onAction={handleAction} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <div 
        className={cn(
          "mb-4 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold">Trợ lý ảo TicketRush</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex w-full flex-col",
                msg.sender === 'user' ? "items-end" : "items-start"
              )}
            >
              <div 
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  msg.sender === 'user' 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : msg.isError
                      ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                )}
              >
                {msg.text}
              </div>
              {msg.ui_components && msg.ui_components.length > 0 && (
                <div className="w-[85%] mt-1">
                  {msg.ui_components.map((comp, idx) => renderComponent(comp, idx))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Đang trả lời...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-background border-t">
          <form onSubmit={onFormSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-muted/50 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-full px-4 py-2 text-sm outline-none transition-all"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!inputValue.trim() || isLoading}
              className="h-10 w-10 rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95",
          isOpen ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
