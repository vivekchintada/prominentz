/**
 * Resto IQ Tool Definitions
 * Compatible with OpenAI / Groq / Gemini function calling schemas.
 * Covers all 10 operational domains ("every nook and cranny") of Resto AI.
 */

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export const RESTO_IQ_TOOLS: ToolDefinition[] = [
  // 1. Live POS Operations & Open Tabs
  {
    type: 'function',
    function: {
      name: 'getLiveOperations',
      description: 'Fetch real-time POS sales, completed checks, open unpaid tabs, table guest counts, and payment method distribution for today.',
      parameters: {
        type: 'object',
        properties: {
          includeOpenTabsList: {
            type: 'boolean',
            description: 'Whether to include detailed roster of open table orders and elapsed wait times.',
          },
        },
      },
    },
  },

  // 2. Kitchen KDS Bottlenecks & Speeds
  {
    type: 'function',
    function: {
      name: 'getKitchenHealth',
      description: 'Check active cooking queue across all KDS stations (HOT, COLD, BAR, EXPO), identify delayed tickets (>15 mins), and calculate station average cook times.',
      parameters: {
        type: 'object',
        properties: {
          delayedOnly: {
            type: 'boolean',
            description: 'Set to true to only return delayed tickets that need expedite action.',
          },
        },
      },
    },
  },

  // 3. Floor Plan, Tables & Capacity
  {
    type: 'function',
    function: {
      name: 'getTableFloorStatus',
      description: 'Inspect live floor plan across all floors: occupied vs empty vs paying tables, banquet capacities, and idle tables with open unpaid checks.',
      parameters: {
        type: 'object',
        properties: {
          floor: {
            type: 'string',
            description: 'Optional floor filter, e.g. "1st Floor", "2nd Floor", "Patio", or "All".',
          },
        },
      },
    },
  },

  // 4. Reservations & Digital Waitlist
  {
    type: 'function',
    function: {
      name: 'getReservationsAndWaitlist',
      description: 'Retrieve today’s reservation roster, party sizes, VIP arrivals, grace period violations, and active digital waitlist queue.',
      parameters: {
        type: 'object',
        properties: {
          vipOnly: {
            type: 'boolean',
            description: 'Set to true to only filter high-value VIP diners arriving today.',
          },
        },
      },
    },
  },

  // 5. Inventory Depletion, Critical Stock & Auto-86
  {
    type: 'function',
    function: {
      name: 'getInventoryAndDepletion',
      description: 'Audit ingredient stock levels, list items breaching minimum safety thresholds, currently 86’d menu items, and pending supplier purchase orders.',
      parameters: {
        type: 'object',
        properties: {
          criticalOnly: {
            type: 'boolean',
            description: 'Filter items where current stock <= minimum threshold.',
          },
        },
      },
    },
  },

  // 6. Financial Economics & Ticket Size Tiers
  {
    type: 'function',
    function: {
      name: 'getSalesAndAOVMetrics',
      description: 'Compute gross/net sales, tax collected, tips pool, spend per guest, and ticket size distribution tiers (<$25, $25-$75, $75-$150, $150+).',
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'last_7_days', 'last_30_days'],
            description: 'Timeframe for financial analytics aggregation.',
          },
        },
      },
    },
  },

  // 7. Loss Prevention, Fraud & Void Auditing
  {
    type: 'function',
    function: {
      name: 'getLossPreventionAudit',
      description: 'Audit server void spikes, post-bill deletions, excessive manager discounts, and cash drawer opening events to prevent theft or cashier fraud.',
      parameters: {
        type: 'object',
        properties: {
          minVoidAmount: {
            type: 'number',
            description: 'Minimum dollar threshold of voids to flag (default: $0).',
          },
        },
      },
    },
  },

  // 8. Labor Efficiency & Team Shifts
  {
    type: 'function',
    function: {
      name: 'getLaborEfficiency',
      description: 'Audit currently clocked-in staff, hourly wage burn rate, today’s labor cost percentage vs revenue (target <=30%), and upcoming shift coverage.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },

  // 9. Customer CRM & VIP Diners
  {
    type: 'function',
    function: {
      name: 'getCrmAndLoyalty',
      description: 'Retrieve top customer profiles, lifetime spend, visit frequency, loyalty points balances, and dining preferences.',
      parameters: {
        type: 'object',
        properties: {
          searchNameOrPhone: {
            type: 'string',
            description: 'Optional guest name or phone number to look up specific profile.',
          },
        },
      },
    },
  },

  // 10. Direct Action: 86 or Restore Menu Item
  {
    type: 'function',
    function: {
      name: 'execute86Item',
      description: 'Immediately 86 (mark unavailable) or restore a menu item across all POS terminals, QR menus, and KDS stations.',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Exact or partial name of the menu item (e.g. "Ribeye", "Salmon", "Tiramisu").',
          },
          is86d: {
            type: 'boolean',
            description: 'True to 86 the item (disable); False to restore availability.',
          },
        },
        required: ['itemName', 'is86d'],
      },
    },
  },

  // 11. Direct Action: Expedite / Prioritize KDS Ticket
  {
    type: 'function',
    function: {
      name: 'executePrioritizeKdsTicket',
      description: 'Mark an active table order as URGENT priority on all kitchen display screens with immediate visual escalation.',
      parameters: {
        type: 'object',
        properties: {
          tableIdentifier: {
            type: 'string',
            description: 'Table name or number (e.g. "Table 4", "4", "Bar 2").',
          },
        },
        required: ['tableIdentifier'],
      },
    },
  },

  // 12. Direct Action: Apply Courtesy Comp / Discount
  {
    type: 'function',
    function: {
      name: 'executeCompTableOrder',
      description: 'Apply an authorized manager courtesy comp or percentage discount to an active open table check.',
      parameters: {
        type: 'object',
        properties: {
          tableIdentifier: {
            type: 'string',
            description: 'Table name or number (e.g. "Table 3", "3").',
          },
          discountPercent: {
            type: 'number',
            description: 'Percentage to discount (e.g. 15 for 15%).',
          },
          reason: {
            type: 'string',
            description: 'Reason for the comp (e.g. "Chef special courtesy", "Delayed entree service").',
          },
        },
        required: ['tableIdentifier', 'discountPercent', 'reason'],
      },
    },
  },
]
