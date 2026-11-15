'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const adminService = require('../services/adminService');
const statsService = require('../services/statsService');
const productService = require('../services/productService');
const orderService = require('../services/orderService');

const getDashboard = asyncHandler(async (_req, res) =>
  sendSuccess(res, { message: 'Admin dashboard', data: await statsService.getAdminDashboard() })
);

const listUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await adminService.listUsers(req.query);
  return sendSuccess(res, { message: 'Users', data: { users }, meta });
});

const getUser = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'User details', data: await adminService.getUserDetails(req.params.id) })
);

const setUserActive = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: req.body.isActive ? 'User activated' : 'User deactivated',
    data: { user: await adminService.setUserActive(req.user, req.params.id, req.body.isActive) },
  })
);

const setUserRole = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'User role updated',
    data: { user: await adminService.setUserRole(req.user, req.params.id, req.body.role) },
  })
);

const setSellerStatus = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: `Seller ${req.body.status}`,
    data: { user: await adminService.setSellerStatus(req.params.id, req.body.status) },
  })
);

const deleteUser = asyncHandler(async (req, res) =>
  sendSuccess(res, { message: 'User deleted', data: await adminService.deleteUser(req.user, req.params.id) })
);

const listProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await productService.listProducts(req.query, { includeInactive: true });
  return sendSuccess(res, { message: 'Products', data: { products }, meta });
});

const listOrders = asyncHandler(async (req, res) => {
  const { orders, meta } = await orderService.listAllOrders(req.query);
  return sendSuccess(res, { message: 'Orders', data: { orders }, meta });
});

const getOrder = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order details',
    data: { order: await orderService.getOrderAsAdmin(req.params.id) },
  })
);

const cancelOrder = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order cancelled',
    data: { order: await orderService.cancelOrder(null, req.params.id, { isAdmin: true }) },
  })
);

const updateItemStatus = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: 'Order item updated',
    data: {
      order: await orderService.updateItemStatus({
        orderId: req.params.id,
        itemId: req.params.itemId,
        actor: req.user,
        status: req.body.status,
        note: req.body.note,
      }),
    },
  })
);

const getLowStock = asyncHandler(async (_req, res) =>
  sendSuccess(res, {
    message: 'Low stock products',
    data: { products: await productService.getLowStockProducts({ limit: 25 }) },
  })
);

module.exports = {
  getDashboard,
  listUsers,
  getUser,
  setUserActive,
  setUserRole,
  setSellerStatus,
  deleteUser,
  listProducts,
  listOrders,
  getOrder,
  cancelOrder,
  updateItemStatus,
  getLowStock,
};
