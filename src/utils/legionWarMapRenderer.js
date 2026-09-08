const DEFAULT_GAP = 3;
const DEFAULT_GRID_SIZE = 41;
const CORE_SURROUNDING_POINTS = new Set([
  "19_16",
  "19_17",
  "20_16",
  "20_18",
  "21_16",
  "21_17",
]);

export const LEGION_WAR_ALLIANCE_COLORS = {
  大联盟: "#667eea",
  梦盟: "#18a058",
  正义联盟: "#2080f0",
  龙盟: "#d03050",
  曦盟: "#9c27b0",
  未知联盟: "#f5a623",
};

export function getLegionWarTypeColor(type) {
  return {
    1: "#4477CE",
    2: "#D835D8",
    3: "#F9B500",
    4: "#D21E1E",
    5: "#2B2B2B",
    6: "#000000",
    9: "#4477CE",
  }[type] || "#cccccc";
}

export function getLegionWarTypeLabel(type) {
  return {
    1: "小",
    2: "中",
    3: "大",
    4: "本",
    5: "城",
    6: "核",
  }[type] || "";
}

export function calculateLegionWarHexSize(
  width,
  height,
  {
    columns = DEFAULT_GRID_SIZE,
    rows = DEFAULT_GRID_SIZE,
    gap = DEFAULT_GAP,
    padding = 10,
    min = 12,
    max = 30,
  } = {},
) {
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const sizeByWidth
    = (availableWidth - (columns - 1) * gap) / (columns * 1.5 + 0.5);
  const sizeByHeight
    = (availableHeight - (rows - 1) * gap)
      / (rows * Math.sqrt(3) + Math.sqrt(3) / 2);

  return Math.max(min, Math.min(sizeByWidth, sizeByHeight, max));
}

export function getLegionWarHexCenter(column, row, hexSize, gap = DEFAULT_GAP) {
  const hexWidth = 2 * hexSize;
  const hexHeight = Math.sqrt(3) * hexSize;
  return {
    x: column * (hexWidth * 0.75) + hexSize + gap * column,
    y: row * hexHeight
      + (column % 2 === 1 ? hexHeight / 2 : 0)
      + gap * row,
  };
}

function traceHexagon(context, x, y, hexSize) {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = ((2 * Math.PI) / 6) * index;
    const pointX = x + hexSize * Math.cos(angle);
    const pointY = y + hexSize * Math.sin(angle);
    if (index === 0)
      context.moveTo(pointX, pointY);
    else
      context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function drawHexagon(context, x, y, hexSize, color) {
  traceHexagon(context, x, y, hexSize);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  context.stroke();
}

function drawText(context, x, y, text, color = "#fff", fontSize = 10) {
  context.fillStyle = color;
  context.font = `bold ${fontSize}px Microsoft Yahei`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}

function drawBackgroundGrid(
  context,
  width,
  height,
  hexSize,
  gap,
) {
  const hexWidth = 2 * hexSize;
  const hexHeight = Math.sqrt(3) * hexSize;
  const columnCount = Math.ceil(width / (hexWidth * 0.75 + gap)) + 2;
  const rowCount = Math.ceil(height / (hexHeight + gap)) + 2;

  context.strokeStyle = "#e0e0e0";
  context.lineWidth = 1;
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const { x, y } = getLegionWarHexCenter(column, row, hexSize, gap);
      traceHexagon(context, x, y, hexSize);
      context.stroke();
    }
  }
}

function drawStaticNodes(context, roadPoints, hexSize, gap) {
  roadPoints.forEach((node) => {
    const [columnText, rowText] = node.id.split("_");
    const column = Number.parseInt(columnText);
    const row = Number.parseInt(rowText);
    if (Number.isNaN(column) || Number.isNaN(row))
      return;

    const { x, y } = getLegionWarHexCenter(column, row, hexSize, gap);
    let color = getLegionWarTypeColor(node.type);
    if (CORE_SURROUNDING_POINTS.has(node.id))
      color = "#cccccc";
    if (node.type === 6)
      color = "#000000";

    drawHexagon(context, x, y, hexSize, color);
    if (node.type !== 9) {
      drawText(context, x, y, getLegionWarTypeLabel(node.type), "#fff", 12);
    }
  });
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fill();
}

function drawLegionLabels(
  context,
  legionInfo,
  legionDetails,
  resolveAlliance,
  hexSize,
  gap,
) {
  Object.values(legionInfo || {}).forEach((legion) => {
    if (!legion.strongholdId)
      return;

    const [columnText, rowText] = legion.strongholdId.split("_");
    const column = Number.parseInt(columnText);
    const row = Number.parseInt(rowText);
    if (Number.isNaN(column) || Number.isNaN(row))
      return;

    const { x, y } = getLegionWarHexCenter(column, row, hexSize, gap);
    const label = `【${legion.serverId}】${legion.name}`;
    const detail = legionDetails[legion.id] || {};
    const alliance = detail.announcement
      ? resolveAlliance(detail.announcement)
      : "未知联盟";
    const background
      = LEGION_WAR_ALLIANCE_COLORS[alliance]
        || LEGION_WAR_ALLIANCE_COLORS.未知联盟;

    context.font = "bold 12px Microsoft Yahei";
    const textWidth = context.measureText(label).width;
    const padding = 10;
    const height = 24;
    const backgroundX = x - textWidth / 2 - padding / 2;
    const backgroundY = y - 32;

    context.fillStyle = background;
    drawRoundedRect(
      context,
      backgroundX,
      backgroundY,
      textWidth + padding,
      height,
      4,
    );
    drawText(context, x, backgroundY + height / 2, label, "#fff", 12);
  });
}

export function renderLegionWarMap({
  canvas,
  data,
  legionDetails = {},
  pixelRatio = 1,
  resolveAlliance,
  roadPoints = [],
}) {
  const container = canvas?.parentElement;
  const context = canvas?.getContext("2d");
  if (!canvas || !container || !context)
    return false;

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  const width = container.clientWidth;
  const height = container.clientHeight;
  const ratio = Number(pixelRatio) || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const hexSize = calculateLegionWarHexSize(width, height);
  const hexWidth = 2 * hexSize;
  const hexHeight = Math.sqrt(3) * hexSize;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  drawBackgroundGrid(context, width, height, hexSize, DEFAULT_GAP);

  context.save();
  context.translate(
    2 * (hexWidth * 0.75 + DEFAULT_GAP),
    -(hexHeight + DEFAULT_GAP),
  );
  drawStaticNodes(context, roadPoints, hexSize, DEFAULT_GAP);
  drawLegionLabels(
    context,
    data?.legionInfo,
    legionDetails,
    resolveAlliance,
    hexSize,
    DEFAULT_GAP,
  );
  context.restore();
  return true;
}
