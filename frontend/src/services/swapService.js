import API from './api';

export const initiateSwap  = (data)     => API.post('/swaps/initiate', data);
export const confirmSwap   = (data)     => API.post('/swaps/confirm', data);
export const getSwapHistory = (riderId) => API.get(`/swaps/history/${riderId}`);
