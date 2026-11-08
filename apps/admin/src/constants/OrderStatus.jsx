const OrderStatus = {
    NEW: 'NEW',
    ACCEPTED: 'ACCEPTED',
    DELIVERED: 'DELIVERED',
    REJECTED: 'REJECTED',
    // Set by the customer before the kitchen accepts; terminal.
    CANCELLED: 'CANCELLED',
};

const OrderStatusColors = {
    [OrderStatus.NEW]: 'info',
    [OrderStatus.ACCEPTED]: 'warning',
    [OrderStatus.DELIVERED]: 'success',
    [OrderStatus.REJECTED]: 'error',
    [OrderStatus.CANCELLED]: 'default',
};

// Orders in these statuses bring no money in and are left out of revenue.
const NonRevenueStatuses = [OrderStatus.REJECTED, OrderStatus.CANCELLED];

// Allowed forward transitions per current status
const OrderStatusTransitions = {
    [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
    [OrderStatus.ACCEPTED]: [OrderStatus.DELIVERED, OrderStatus.REJECTED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.REJECTED]: [],
    [OrderStatus.CANCELLED]: [],
};

export { OrderStatus, OrderStatusColors, OrderStatusTransitions, NonRevenueStatuses };
