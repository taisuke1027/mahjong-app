/**
 * levelUpView.js — 運動記録後、「習慣スコア」「BPTレベル」「総運動日数（10日間隔）」の
 * いずれかが更新されていた場合に表示する、レベルアップ／記録更新の演出オーバーレイ。
 * モチベーション向上のため、結果画面から「運動記録を見る」で遷移するタイミングで表示する。
 */
const LevelUpView = {
  itemMeta: {
    habitLevelUp: { label: "習慣スコア", icon: "star" },
    assetLevelUp: { label: "BPTレベル", icon: "medal" },
    daysMilestone: { label: "総運動日数", icon: "calendar" },
  },

  /**
   * @param {object} achievements RecordView.diffAchievements() の戻り値（null以外）
   * @param {Function} onDone 演出を閉じたあとに呼ばれるコールバック（画面遷移など）
   */
  show(achievements, onDone) {
    const hasLevelUp = !!(achievements.habitLevelUp || achievements.assetLevelUp);
    const title = hasLevelUp ? "レベルアップ！" : "記録更新！";

    const items = [];
    if (achievements.habitLevelUp) items.push(this.renderTransitionItem("habitLevelUp", achievements.habitLevelUp));
    if (achievements.assetLevelUp) items.push(this.renderTransitionItem("assetLevelUp", achievements.assetLevelUp));
    if (achievements.daysMilestone) items.push(this.renderMilestoneItem(achievements.daysMilestone));

    const root = document.getElementById("overlayRoot");
    const overlay = el(`
      <div class="overlay" id="levelUpOverlay">
        <div class="result-sheet level-up-sheet">
          <div class="level-up-confetti">${this.renderConfetti()}</div>
          <img src="mascot-body-jump.png" alt="しばまる" class="level-up-mascot" />
          <div class="level-up-hanko">${icon("star", { size: 16 })} ${title}</div>
          <div class="level-up-items">${items.join("")}</div>
          <button class="btn-primary" id="levelUpCloseBtn">運動記録を見る</button>
        </div>
      </div>
    `);
    root.appendChild(overlay);

    document.getElementById("levelUpCloseBtn").addEventListener("click", () => {
      overlay.remove();
      if (onDone) onDone();
    });
  },

  renderConfetti() {
    // 紙吹雪はテーマカラーに合わせ、位置・速度・遅延をランダムにして毎回違う見え方にする
    const colors = ["#B08A46", "#9C7838", "#B5493C", "#8FA678", "#6E8FAE", "#C9A15A"];
    let pieces = "";
    for (let i = 0; i < 22; i++) {
      const left = Math.random() * 100;
      const delay = (Math.random() * 0.5).toFixed(2);
      const duration = (1.3 + Math.random() * 0.9).toFixed(2);
      const color = colors[i % colors.length];
      const isCircle = i % 2 === 0;
      pieces += `<span class="confetti-piece${isCircle ? " circle" : ""}" style="left:${left}%; background:${color}; animation-delay:${delay}s; animation-duration:${duration}s;"></span>`;
    }
    return pieces;
  },

  renderTransitionItem(key, data) {
    const meta = this.itemMeta[key];
    return `
      <div class="level-up-item">
        <div class="lu-label">${icon(meta.icon, { size: 13 })} ${meta.label}</div>
        <div class="lu-transition">
          <span class="from">${data.before}</span>
          <span class="arrow">→</span>
          <span class="to">${data.after}</span>
        </div>
      </div>
    `;
  },

  renderMilestoneItem(data) {
    const meta = this.itemMeta.daysMilestone;
    return `
      <div class="level-up-item">
        <div class="lu-label">${icon(meta.icon, { size: 13 })} ${meta.label}</div>
        <div class="lu-single">${data.days}日達成！</div>
      </div>
    `;
  }
};
