import API from './api';

export const getFleetOverview = ()        => API.get('/admin/fleet-overview');
export const getAnalytics     = ()        => API.get('/admin/analytics');
export const getAllUsers       = ()        => API.get('/admin/users');
export const updateUser        = (id, data) => API.put(`/admin/users/${id}`, data);
export const deleteUser        = (id)     => API.delete(`/admin/users/${id}`);
