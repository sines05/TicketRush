import { api, unwrap } from './api';

export const aiService = {
  sendMessage: async (message, threadId = null) => {
    const response = await api.post('/chat', { 
      message,
      thread_id: threadId 
    });
    return unwrap(response);
  }
};

export default aiService;
