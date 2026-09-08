export const createScheduledTaskParameters = (source: Record<string, any> = {}) => ({
  boxCount: Number(source.boxCount ?? 100),
  fishCount: Number(source.fishCount ?? 100),
  recruitCount: Number(source.recruitCount ?? 100),
  targetBoxPoints: Number(source.targetBoxPoints ?? 1000),
  defaultBoxType: Number(source.defaultBoxType ?? 2001),
  defaultFishType: Number(source.defaultFishType ?? 1),
  receiverId: String(source.receiverId ?? ""),
  password: String(source.password ?? ""),
  giftQuantity: Number(source.giftQuantity ?? 0),
});

export type ScheduledTaskParameters = ReturnType<typeof createScheduledTaskParameters>;

export const validateScheduledTaskParameters = (tasks: string[], params: ScheduledTaskParameters) => {
  const positiveInt = (value: number, max: number) => Number.isSafeInteger(value) && value >= 1 && value <= max;
  if (tasks.includes("batchOpenBox") && (!positiveInt(params.boxCount, 10000) || ![2001, 2002, 2003, 2004].includes(params.defaultBoxType)))
    return "请设置有效的开箱数量（1-10000）和宝箱类型";
  if (tasks.includes("batchFish") && (!positiveInt(params.fishCount, 10000) || ![1, 2].includes(params.defaultFishType)))
    return "请设置有效的钓鱼数量（1-10000）和鱼竿类型";
  if (tasks.includes("batchRecruit") && !positiveInt(params.recruitCount, 10000))
    return "请设置有效的招募数量（1-10000）";
  if (tasks.includes("batchOpenBoxByPoints") && !positiveInt(params.targetBoxPoints, 1000000))
    return "请设置有效的积分开箱目标（1-1000000）";
  if (tasks.includes("batchLegacyGiftSendEnhanced")) {
    if (!/^\d+$/.test(params.receiverId) || !positiveInt(Number(params.receiverId), Number.MAX_SAFE_INTEGER))
      return "请设置有效的赠送接收者 ID";
    if (!params.password.trim())
      return "请设置赠送安全密码";
    if (params.giftQuantity !== 0 && !positiveInt(params.giftQuantity, 9999))
      return "赠送数量须为1-9999，或选择全部库存";
  }
  return "";
};

export const readLegacyScheduledParameters = () => {
  const raw = localStorage.getItem("batchSettings");
  return createScheduledTaskParameters(raw ? JSON.parse(raw) : {});
};
