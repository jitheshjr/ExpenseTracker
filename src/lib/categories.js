export const CATEGORIES = [
  { id: 'Food',        label: 'Food',        icon: 'ti-tools-kitchen-2', type: 'expense'    },
  { id: 'Petrol',      label: 'Petrol',      icon: 'ti-gas-station',     type: 'expense'    },
  { id: 'Travel',      label: 'Travel',      icon: 'ti-plane',           type: 'expense'    },
  { id: 'Grooming',    label: 'Grooming',    icon: 'ti-tool',            type: 'expense'    },
  { id: 'Other',       label: 'Other',       icon: 'ti-dots',            type: 'expense'    },
  { id: 'Income',      label: 'Income',      icon: 'ti-wallet',          type: 'income'     },
  { id: 'Mutual Fund', label: 'Mutual Fund', icon: 'ti-trending-up',     type: 'investment' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.type === 'expense')

export const getCategoryIcon = (id) => CATEGORY_MAP[id]?.icon || 'ti-circle'
export const getCategoryType = (id) => CATEGORY_MAP[id]?.type || 'expense'