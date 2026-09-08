import { h } from "vue";
import { NTag } from "naive-ui";
import { LINEUP_RULES } from "@/utils/heroList";

export const createPeachLegacyColumns = ({ formatPower, onPlayerSelect }) => [
  {
    title: "序号",
    key: "index",
    width: 60,
    align: "center",
    render: (_, index) => index + 1,
  },
  {
    title: "头像",
    key: "headImg",
    width: 60,
    align: "center",
    render: (row) => row.headImg
      ? h("img", {
          src: row.headImg,
          class: "member-avatar-cell",
          alt: row.name,
        })
      : h(
          "div",
          { class: "member-avatar-placeholder-cell" },
          row.name?.charAt(0) || "?",
        ),
  },
  {
    title: "角色名称",
    key: "name",
    width: 150,
    align: "center",
    render: (row) => h(
      "span",
      {
        style: {
          cursor: "pointer",
          color: "#1890ff",
          textDecoration: "underline",
        },
        onClick: () => onPlayerSelect(row.id),
      },
      row.name,
    ),
  },
  {
    title: "战力",
    key: "power",
    width: 100,
    align: "center",
    render: (row) => formatPower(row.power),
  },
  {
    title: "红淬",
    key: "redQuench",
    width: 80,
    align: "center",
    render: (row) => h("span", { style: { color: "#ff4d4f" } }, row.redQuench),
  },
  {
    title: "阵容(红数)[四圣等级]",
    key: "lineup",
    align: "left",
    render: (row) => {
      const nodes = [];
      const heroes = row.heroList || [];
      heroes.forEach((hero, index) => {
        nodes.push(h("span", { style: { color: "#40a9ff" } }, hero.heroName));
        nodes.push(h("span", { style: { color: "#ff4d4f" } }, `(${hero.red})`));
        if (hero.HolyBeast)
          nodes.push(h("span", { style: { color: "#52c41a" } }, `[${hero.HBlevel}]`));
        if (index < heroes.length - 1)
          nodes.push(", ");
      });
      return h("span", { style: { fontSize: "12px" } }, nodes);
    },
  },
  {
    title: "阵容类型",
    key: "lineupType",
    width: 100,
    align: "center",
    render: (row) => {
      const color = LINEUP_RULES.find((rule) => rule.name === row.lineupType)?.colorProps || {
        color: "#f5f5f5",
        textColor: "#666",
      };
      return h(
        NTag,
        { color, size: "small", bordered: false },
        { default: () => row.lineupType },
      );
    },
  },
];
