import api, { unwrap } from './api.js'

export const registerUser = (payload) => unwrap(api.post('/auth/register', payload))
export const loginUser = (payload) => unwrap(api.post('/auth/login', payload))
export const logoutUser = () => unwrap(api.post('/auth/logout'))
export const fetchMe = () => unwrap(api.get('/auth/me'))
export const fetchProfile = () => unwrap(api.get('/users/profile'))
export const updateProfile = (payload) => unwrap(api.patch('/users/profile', payload))
export const changePassword = (payload) => unwrap(api.patch('/users/password', payload))
