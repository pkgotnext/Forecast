import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const forecastApi = {
  // Sales
  getMy: (params) => api.get('/forecasts/my', { params }),
  getMyStats: () => api.get('/forecasts/my/stats'),
  create: (data) => api.post('/forecasts', data),
  update: (id, data) => api.put(`/forecasts/${id}`, data),
  remove: (id) => api.delete(`/forecasts/${id}`),
  getHistory: (id) => api.get(`/forecasts/${id}/history`),
  removeGroup: (groupId) => api.delete('/forecasts/recurring/group', {
    params: { group_id: groupId }
  }),
  updateGroup: (groupId, data) => api.put(`/forecasts/recurring/group/${groupId}`, data),
  createRecurring: (data) => api.post('/forecasts/recurring', data),

  // Management
  getAll: (params) => api.get('/forecasts', { params }),
  getAllStats: (params) => api.get('/forecasts/management/stats', { params }),
  exportXml: (params) => api.get('/forecasts/management/export/xml', {
    params,
    responseType: 'blob',
  }),
}

export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
}

export default api