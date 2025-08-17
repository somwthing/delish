// File: middlewares/validateOrder.js

/**
 * Middleware to validate incoming order payload.
 * Ensures required fields are present, parses stringified JSON for items,
 * enforces correct types and structure, and normalizes field names.
 */

module.exports = (req, res, next) => {
  let {
    userId,
    items,
    total,
    clientName,
    clientContact,
    clientEmail,
    clientAddress,
    clientBuilding,
    clientFloor
  } = req.body;

  // Normalize field names
  const email    = clientEmail;
  const address  = clientAddress;
  const building = clientBuilding;
  const floor    = clientFloor;

  // Parse stringified items if needed
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      console.error('[VALIDATE] Items parse failed:', err.message);
      return res.status(400).json({ error: 'Invalid items format (JSON parse failed)' });
    }
  }

  // Basic top-level checks
  const missingFields = [];
  if (typeof userId !== 'string')                         missingFields.push('userId');
  if (!Array.isArray(items) || items.length === 0)        missingFields.push('items');
  if (typeof total !== 'string' || isNaN(parseFloat(total))) missingFields.push('total');
  if (typeof clientName !== 'string')                     missingFields.push('clientName');
  if (typeof clientContact !== 'string')                  missingFields.push('clientContact');
  if (typeof email !== 'string')                          missingFields.push('clientEmail');
  if (typeof address !== 'string')                        missingFields.push('clientAddress');
  if (typeof building !== 'string')                       missingFields.push('clientBuilding');
  if (typeof floor !== 'string')                          missingFields.push('clientFloor');

  if (missingFields.length > 0) {
    console.error('[VALIDATE] Missing or invalid top-level fields:', missingFields);
    return res
      .status(400)
      .json({ error: 'Missing or invalid fields: ' + missingFields.join(', ') });
  }

  // Validate structure and types of each item
  for (const item of items) {
    if (
      typeof item !== 'object' ||
      typeof item.itemId !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.price !== 'number' ||
      typeof item.quantity !== 'number'
    ) {
      console.error('[VALIDATE] Invalid item structure:', item);
      return res.status(400).json({ error: 'Invalid item structure' });
    }
  }

  // Overwrite req.body with validated and normalized values
  req.body.userId        = userId;
  req.body.items         = items;
  req.body.total         = total;
  req.body.clientName    = clientName;
  req.body.clientContact = clientContact;
  req.body.clientEmail   = email;
  req.body.address       = address;
  req.body.building      = building;
  req.body.floor         = floor;

  next();
};
