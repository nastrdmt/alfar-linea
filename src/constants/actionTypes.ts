export const ACTION_TYPE_SWAP = "SWAP";
export const ACTION_TYPE_SUPPLY = "SUPPLY";
export const ACTION_TYPE_SEND_MAIL = "SEND_MAIL";

const ACTION_TYPES = [
  ACTION_TYPE_SWAP,
  ACTION_TYPE_SUPPLY,
  ACTION_TYPE_SEND_MAIL,
] as const;

export default ACTION_TYPES;