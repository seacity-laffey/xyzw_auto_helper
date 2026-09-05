import { h } from "vue";

export function createClubWarRankColumns({
  InputNumber,
  Select,
  allianceOptions,
  formatPower,
  getAllianceTagClass,
  getLineupTagStyle,
  getMemberAlliance,
  getMemberRank,
  handleHeroClick,
  handleRankBlur,
  handleRankFocus,
  isCurrentAccountClub,
  isEditMode,
  manualAlliances,
  manualRankings,
}) {
  const getMergedTableRowColSpan = (row) =>
    row.__isGroupHeader || row.__isFetchTimeFooter ? 9 : 1;
  const getHiddenMergedTableCellColSpan = (row) =>
    row.__isGroupHeader || row.__isFetchTimeFooter ? 0 : 1;

  return [
    {
      title: "红淬排名",
      key: "rank",
      width: 72,
      align: "center",
      colSpan: getMergedTableRowColSpan,
      render: (row) => {
        if (row.__isGroupHeader) {
          const redQuenchLabel = row.count > 1 ? "平均红淬" : "红淬";
          return h("div", { class: "salt-alliance-group-title" }, [
            h("span", { class: "salt-alliance-group-line" }, "|"),
            h(
              "span",
              { class: "salt-alliance-group-label" },
              `${row.alliance}（${row.count}家） ${redQuenchLabel} ${row.avgRedQuench}红`,
            ),
          ]);
        }
        if (row.__isFetchTimeFooter) {
          return h("div", { class: "salt-fetch-time-footer" }, row.fetchTimeText);
        }
        if (isEditMode.value) {
          return h(InputNumber, {
            "value": manualRankings.value[row.id],
            "onUpdate:value": (value) => {
              manualRankings.value[row.id] = value;
            },
            "size": "small",
            "min": 1,
            "max": 20,
            "style": { width: "70px" },
            "showButton": false,
            "onFocus": () => handleRankFocus(row),
            "onBlur": () => handleRankBlur(row),
            "onKeydownenter": (e) => e.target.blur(),
          });
        }
        const rank = getMemberRank(row);
        return h("span", { class: "rank-badge" }, rank);
      },
    },
    {
      title: "俱乐部名称",
      key: "name",
      width: 180,
      colSpan: getHiddenMergedTableCellColSpan,
      render: (row) => {
        if (row.__isGroupHeader || row.__isFetchTimeFooter)
          return null;
        const isCurrentClub = isCurrentAccountClub(row);
        return h(
          "div",
          {
            class: [
              "salt-club-name-cell",
              isCurrentClub ? "is-current-club" : "",
            ],
          },
          [
            h("div", { class: "salt-club-main-row" }, [
              row.logo
                ? h("img", {
                    src: row.logo,
                    alt: row.name,
                    style: {
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #e5e7eb",
                    },
                  })
                : h(
                    "div",
                    {
                      style: {
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "white",
                        background:
                        "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                        border: "2px solid #e5e7eb",
                      },
                    },
                    row.name?.charAt(0) || "?",
                  ),
              h("span", { class: "salt-club-name-text" }, row.name),
            ]),
            isCurrentClub
              ? h("div", { class: "current-club-badge-row" }, [
                  h("span", { class: "current-club-badge" }, "本俱乐部"),
                ])
              : null,
          ],
        );
      },
    },
    {
      title: "服务器",
      key: "serverId",
      width: 56,
      align: "center",
      colSpan: getHiddenMergedTableCellColSpan,
    },
    {
      title: "战力",
      key: "power",
      width: 80,
      align: "center",
      colSpan: getHiddenMergedTableCellColSpan,
      render: (row) =>
        row.__isGroupHeader || row.__isFetchTimeFooter
          ? null
          : formatPower(row.power) || 0,
    },
    {
      title: "红淬",
      key: "redQuench",
      width: 52,
      align: "center",
      colSpan: getHiddenMergedTableCellColSpan,
    },
    {
      title: "联盟",
      key: "alliance",
      width: 72,
      align: "center",
      colSpan: getHiddenMergedTableCellColSpan,
      render: (row) => {
        if (row.__isGroupHeader || row.__isFetchTimeFooter)
          return null;
        if (isEditMode.value) {
          return h(Select, {
            "value": manualAlliances.value[row.id],
            "options": allianceOptions,
            "onUpdate:value": (value) => {
              manualAlliances.value[row.id] = value;
            },
            "size": "small",
            "style": { width: "90px" },
          });
        }
        const alliance = getMemberAlliance(row);
        return h(
          "span",
          { class: ["salt-alliance-tag", getAllianceTagClass(alliance)] },
          alliance,
        );
      },
    },
    {
      title: "前三车头",
      key: "topHeroes",
      width: 528,
      colSpan: getHiddenMergedTableCellColSpan,
      render: (row) => {
        if (row.__isGroupHeader || row.__isFetchTimeFooter)
          return null;
        return h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              gap: "9px",
              justifyContent: "center",
              alignItems: "flex-start",
              width: "calc(100% + 8px)",
              minWidth: "528px",
              margin: "0 -4px",
            },
          },
          row.topHeroes.map((hero) =>
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "6px",
                  width: "170px",
                  padding: "5px 5px 5px 5px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  flexShrink: "0",
                },
              },
              [
                h(
                  "div",
                  {
                    style: {
                      width: "36px",
                      height: "36px",
                      minWidth: "36px",
                      minHeight: "36px",
                      flexShrink: "0",
                      cursor: "pointer",
                    },
                    onClick: () => handleHeroClick(hero),
                  },
                  [
                    hero.headImg
                      ? h("img", {
                          src: hero.headImg,
                          alt: hero.name,
                          style: {
                            width: "36px",
                            height: "36px",
                            minWidth: "36px",
                            minHeight: "36px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #e5e7eb",
                            display: "block",
                            flexShrink: "0",
                          },
                        })
                      : h(
                          "div",
                          {
                            style: {
                              width: "36px",
                              height: "36px",
                              minWidth: "36px",
                              minHeight: "36px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: "bold",
                              color: "white",
                              background:
                              "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                              border: "2px solid #e5e7eb",
                              flexShrink: "0",
                            },
                          },
                          hero.name?.charAt(0) || "?",
                        ),
                  ],
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      flex: "1 1 auto",
                      minWidth: "0",
                    },
                  },
                  [
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          width: "100%",
                          minWidth: "0",
                          whiteSpace: "nowrap",
                        },
                      },
                      [
                        h(
                          "span",
                          {
                            style: {
                              fontSize: "11px",
                              fontWeight: "500",
                              color: "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              minWidth: "0",
                            },
                          },
                          hero.name || "未知",
                        ),
                        h(
                          "span",
                          {
                            style: {
                              fontSize: "9px",
                              color: "white",
                              background:
                              "linear-gradient(135deg, #ff6b6b, #ee5a24)",
                              padding: "1px 3px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              marginLeft: "auto",
                              flexShrink: "0",
                            },
                          },
                          `圣${hero.holyBeast}`,
                        ),
                      ],
                    ),
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          width: "100%",
                          minWidth: "0",
                          whiteSpace: "nowrap",
                        },
                      },
                      [
                        h(
                          "span",
                          {
                            style: {
                              fontSize: "11px",
                              color: "#6b7280",
                              whiteSpace: "nowrap",
                              minWidth: "50px",
                              flexShrink: "0",
                            },
                          },
                          formatPower(hero.power),
                        ),
                        h(
                          "span",
                          { style: getLineupTagStyle(hero.lineupType) },
                          hero.lineupType || "其他",
                        ),
                        h(
                          "span",
                          {
                            style: {
                              fontSize: "11px",
                              fontWeight: "500",
                              marginLeft: "auto",
                              flexShrink: "0",
                              color: "#ef4444",
                            },
                          },
                          `${hero.redQuench}红`,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    },
    {
      title: "等级",
      key: "level",
      width: 40,
      align: "center",
      colSpan: getHiddenMergedTableCellColSpan,
    },
    {
      title: "公告",
      key: "announcement",
      width: 300,
      colSpan: getHiddenMergedTableCellColSpan,
    },
  ];
}
