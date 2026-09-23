export function buildTowerEnergyPurchase(weird, quantity) {
  const count = Number(quantity);
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new Error("购买数量必须为1–100的整数");
  return weird
    ? { cmd: "evotower_buyenergy", params: { energy: count } }
    : { cmd: "tower_buyenergy", params: { buyNum: count } };
}
