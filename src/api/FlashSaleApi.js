import client from "./client";

export const createSale = (payload) =>
  client.post("/flash-sales", payload).then((r) => r.data);

export const initSale = (itemId) =>
  client.post(`/flash-sales/${itemId}/init`).then((r) => r.data);

export const purchase = (itemId, userId, config) =>
  client.post(`/flash-sales/${itemId}/purchase`, { userId }, config).then((r) => r.data);

export const getStock = (itemId) =>
  client.get(`/flash-sales/${itemId}/stock`).then((r) => r.data);

export const getSales = () =>
  client.get("/flash-sales").then((r) => r.data);

export const getSale = (itemId) =>
  client.get(`/flash-sales/${itemId}`).then((r) => r.data);

export const getOrders = (userId) =>
  client.get("/orders", { params: { userId } }).then((r) => r.data);