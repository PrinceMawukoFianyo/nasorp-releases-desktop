import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('localApi', {
  getProducts: () => ipcRenderer.invoke('products:list'),
  createSale: (productId: string, qty: number, price: number) =>
    ipcRenderer.invoke('sales:create', productId, qty, price),
  onDataUpdated: (callback: () => void) =>
    ipcRenderer.on('data:updated', callback),
});