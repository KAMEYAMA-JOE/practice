// ========================================
// 麻雀精算ポイント計算機 - JavaScriptコア
// ========================================

// グローバル状態管理
let currentRules = {
    players: 4,
    genten: 25000,
    kaeshi: 30000,
    uma: "10-30",
    rounding: "5sha6nyu",
    sameScore: "wind",
    tobi: 0,
    yakitori: 0
};

let calculatedResults = null;

// ストレージキー定数
const STORAGE_RULES_KEY = 'mj_calc_rules';
const STORAGE_HISTORY_KEY = 'mj_calc_history';

// ========== 初期化 ==========
window.addEventListener('DOMContentLoaded', () => {
    loadRulesFromStorage();
    initPlayerInputs();
    updateRuleDescription();
    loadHistory();
});

// ========== タブ切り替え ==========
function switchTab(tabId) {
    // タブ要素の管理
    const allSections = document.querySelectorAll('.content-section');
    const allButtons = document.querySelectorAll('.tab-btn');
    
    allSections.forEach(el => el.classList.remove('active'));
    allButtons.forEach(el => {
        el.setAttribute('aria-selected', 'false');
        el.classList.remove('active');
    });
    
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // ボタンのアクティブ状態を設定
    const tabMap = {
        'input-tab': 'tab-input',
        'rule-tab': 'tab-rule',
        'history-tab': 'tab-history'
    };
    
    const btnId = tabMap[tabId];
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.setAttribute('aria-selected', 'true');
        btn.classList.add('active');
    }
}

// ========== プレイヤー入力の動的生成 ==========
function initPlayerInputs() {
    const container = document.getElementById('player-inputs-container');
    if (!container) return;
    
    container.innerHTML = '';
    const count = parseInt(currentRules.players);
    const winds = ['東', '南', '西', '北'];

    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.setAttribute('data-player-id', i);
        
        const wind = winds[i];
        row.innerHTML = `
            <div class="player-cell-wind" aria-label="座">${wind}</div>
            <div class="player-cell-name">
                <input 
                    type="text" 
                    id="p-name-${i}" 
                    class="player-name-input"
                    value="プレイヤー${wind}" 
                    placeholder="プレイヤー名"
                    aria-label="プレイヤー${wind}の名前"
                >
            </div>
            <div class="player-cell-score">
                <input 
                    type="number" 
                    id="p-score-${i}" 
                    class="p-score-input"
                    value="" 
                    placeholder="持点(100点単位)" 
                    step="100"
                    aria-label="プレイヤー${wind}の最終持ち点"
                >
            </div>
        `;
        container.appendChild(row);
    }
    
    setupRealtimeValidation();
}

function togglePlayerCount() {
    const select = document.getElementById('rule-players');
    if (!select) return;
    
    currentRules.players = parseInt(select.value);
    initPlayerInputs();
}

// ========== リアルタイムバリデーション ==========
function setupRealtimeValidation() {
    const inputs = document.querySelectorAll('.p-score-input');
    
    inputs.forEach(input => {
        input.removeEventListener('input', validateScores);
        input.addEventListener('input', validateScores);
    });
    
    validateScores();
}

function validateScores() {
    const count = parseInt(currentRules.players);
    const targetTotal = parseInt(currentRules.genten) * count;
    
    let filledCount = 0;
    let currentTotal = 0;
    let emptyIndex = -1;

    for (let i = 0; i < count; i++) {
        const input = document.getElementById(`p-score-${i}`);
        if (!input) continue;
        
        const val = input.value.trim();
        if (val !== "") {
            const numVal = parseInt(val);
            if (!isNaN(numVal)) {
                filledCount++;
                currentTotal += numVal;
            }
        } else {
            emptyIndex = i;
        }
    }

    const indicator = document.getElementById('validation-indicator');
    const calcBtn = document.getElementById('calc-btn');
    
    if (!indicator || !calcBtn) return;

    // 自動補完（残り1名のみ未入力のとき）
    if (filledCount === count - 1 && emptyIndex !== -1) {
        const autoScore = targetTotal - currentTotal;
        const input = document.getElementById(`p-score-${emptyIndex}`);
        if (input) {
            input.placeholder = `自動補完: ${autoScore}`;
        }
    }

    // 合計整合性チェック
    if (filledCount === count) {
        if (currentTotal === targetTotal) {
            indicator.className = "indicator success";
            indicator.textContent = `✓ 合計点数チェックOK: ${currentTotal.toLocaleString()}点`;
            calcBtn.disabled = false;
            calcBtn.style.opacity = "1";
        } else {
            const diff = targetTotal - currentTotal;
            indicator.className = "indicator error";
            indicator.textContent = `✗ 点数が合いません: 合計 ${currentTotal.toLocaleString()}点 (目標 ${targetTotal.toLocaleString()}点 / 差額 ${diff}点)`;
            calcBtn.disabled = true;
            calcBtn.style.opacity = "0.6";
        }
    } else {
        indicator.className = "indicator error";
        indicator.textContent = `全員の点数を入力してください (合計目標: ${targetTotal.toLocaleString()}点)`;
        calcBtn.disabled = true;
        calcBtn.style.opacity = "0.6";
    }
}

// ========== ルール設定の管理 ==========
function saveRules(event) {
    if (event) event.preventDefault();
    
    try {
        currentRules.players = parseInt(document.getElementById('rule-players')?.value || 4);
        currentRules.genten = parseInt(document.getElementById('rule-genten')?.value || 25000);
        currentRules.kaeshi = parseInt(document.getElementById('rule-kaeshi')?.value || 30000);
        currentRules.uma = document.getElementById('rule-uma')?.value || "10-30";
        currentRules.rounding = document.getElementById('rule-rounding')?.value || "5sha6nyu";
        currentRules.sameScore = document.getElementById('rule-same-score')?.value || "wind";
        currentRules.tobi = parseInt(document.getElementById('rule-tobi')?.value || 0);
        currentRules.yakitori = parseInt(document.getElementById('rule-yakitori')?.value || 0);

        localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(currentRules));
        updateRuleDescription();
        initPlayerInputs();
        
        alert('✓ ルール設定をブラウザに保存しました。');
        switchTab('input-tab');
    } catch (error) {
        console.error('ルール保存エラー:', error);
        alert('ルール保存に失敗しました。');
    }
}

function loadRulesFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_RULES_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            currentRules = { ...currentRules, ...parsed };
            
            // UI要素を更新
            const ruleInputs = {
                'rule-players': currentRules.players,
                'rule-genten': currentRules.genten,
                'rule-kaeshi': currentRules.kaeshi,
                'rule-uma': currentRules.uma,
                'rule-rounding': currentRules.rounding,
                'rule-same-score': currentRules.sameScore,
                'rule-tobi': currentRules.tobi,
                'rule-yakitori': currentRules.yakitori
            };
            
            Object.entries(ruleInputs).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = value;
            });
        }
    } catch (error) {
        console.error('ルール読み込みエラー:', error);
    }
}

function updateRuleDescription() {
    const desc = document.getElementById('current-rule-desc');
    if (desc) {
        desc.textContent = 
            `${currentRules.players}人打ち / ${currentRules.genten.toLocaleString()}点持 ${currentRules.kaeshi.toLocaleString()}点返 / ウマ(${currentRules.uma})`;
    }
}

// ========== 端数処理ロジック ==========
function roundPoint(rawPoint, method) {
    if (method === 'keep') {
        return Math.round(rawPoint * 10) / 10;
    }

    const sign = rawPoint >= 0 ? 1 : -1;
    const absVal = Math.abs(rawPoint);
    let rounded = Math.round(absVal);

    if (method === '5sha6nyu') {
        // 五捨六入：小数第一位が0.5以下なら切り捨て、0.6以上なら切り上げ
        const fraction = absVal - Math.floor(absVal);
        if (fraction >= 0.5001) {
            rounded = Math.ceil(absVal);
        } else if (fraction <= 0.5) {
            rounded = Math.floor(absVal);
        }
    } else if (method === 'kirisute') {
        // 切り捨て
        rounded = Math.floor(absVal);
    } else if (method === 'shishagonyu') {
        // 四捨五入
        rounded = Math.round(absVal);
    }

    return rounded * sign;
}

// ========== 精算ポイント計算コア ==========
function calculateScores(event) {
    if (event) event.preventDefault();
    
    try {
        const count = currentRules.players;
        let playersData = [];

        // プレイヤーデータの収集
        for (let i = 0; i < count; i++) {
            const nameEl = document.getElementById(`p-name-${i}`);
            const scoreEl = document.getElementById(`p-score-${i}`);
            
            if (!scoreEl || scoreEl.value.trim() === '') {
                alert(`プレイヤー${i + 1}の点数を入力してください。`);
                return;
            }

            const score = parseInt(scoreEl.value);
            if (isNaN(score)) {
                alert(`プレイヤー${i + 1}の点数が無効です。`);
                return;
            }

            playersData.push({
                id: i,
                name: nameEl?.value || `プレイヤー${i + 1}`,
                score: score,
                initialIndex: i
            });
        }

        // 着順による並び替え
        playersData.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (currentRules.sameScore === 'wind') return a.initialIndex - b.initialIndex;
            return 0;
        });

        // ランク付け
        let currentRank = 1;
        for (let i = 0; i < count; i++) {
            if (i > 0 && playersData[i].score < playersData[i - 1].score) {
                currentRank = i + 1;
            }
            playersData[i].rank = currentRank;
        }

        // ウマ配列の設定
        let umaArray = getUmaArray(count);

        // 同着時の処理
        if (currentRules.sameScore === 'split') {
            assignUmaSplit(playersData, umaArray);
        } else {
            playersData.forEach((p, idx) => {
                p.assignedUma = umaArray[idx] || 0;
            });
        }

        // ポイント計算
        calculatePoints(playersData);

        // 結果表示
        displayResults(playersData);
        calculatedResults = playersData;

    } catch (error) {
        console.error('計算エラー:', error);
        alert('計算処理中にエラーが発生しました。');
    }
}

function getUmaArray(count) {
    const uma = currentRules.uma;
    if (count === 3) {
        if (uma === '5-10') return [15, 0, -15];
        if (uma === '10-20') return [20, 0, -20];
        if (uma === '10-30') return [30, 0, -30];
        if (uma === '20-30') return [30, 0, -30];
    } else {
        if (uma === '5-10') return [15, 5, -5, -15];
        if (uma === '10-20') return [20, 10, -10, -20];
        if (uma === '10-30') return [30, 10, -10, -30];
        if (uma === '20-30') return [30, 20, -20, -30];
    }
    return [0, 0, 0, 0];
}

function assignUmaSplit(playersData, umaArray) {
    let rankGroups = {};
    playersData.forEach(p => {
        if (!rankGroups[p.rank]) rankGroups[p.rank] = [];
        rankGroups[p.rank].push(p);
    });

    let idxPointer = 0;
    Object.keys(rankGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(r => {
        const group = rankGroups[r];
        let sumUma = 0;
        for (let k = 0; k < group.length; k++) {
            sumUma += umaArray[idxPointer + k] || 0;
        }
        const avgUma = sumUma / group.length;
        group.forEach(p => { p.assignedUma = avgUma; });
        idxPointer += group.length;
    });
}

function calculatePoints(playersData) {
    const count = currentRules.players;
    const totalOkaPoints = ((currentRules.kaeshi - currentRules.genten) * count) / 1000;

    playersData.forEach((p, idx) => {
        // 基本スコア計算
        let rawSoten = (p.score - currentRules.kaeshi) / 1000;
        p.pt = rawSoten + p.assignedUma;

        // オカ（トップ賞）の配分
        if (currentRules.sameScore === 'split') {
            const topCount = playersData.filter(x => x.rank === 1).length;
            if (p.rank === 1) p.pt += totalOkaPoints / topCount;
        } else {
            if (idx === 0) p.pt += totalOkaPoints;
        }

        // 端数処理
        p.pt = roundPoint(p.pt, currentRules.rounding);
    });

    // ゼロサム微調整（誤差を最下位に集約）
    if (currentRules.rounding !== 'keep') {
        let totalPt = playersData.reduce((sum, p) => sum + p.pt, 0);
        if (Math.abs(totalPt) > 0.01) {
            playersData[count - 1].pt = 
                Math.round((playersData[count - 1].pt - totalPt) * 10) / 10;
        }
    }
}

function displayResults(playersData) {
    const tbody = document.getElementById('result-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    playersData.forEach((p) => {
        const tr = document.createElement('tr');
        const ptClass = p.pt > 0.01 ? 'score-plus' : (p.pt < -0.01 ? 'score-minus' : '');
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        
        tr.innerHTML = `
            <td class="rank-${p.rank}">${p.rank}位</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.score.toLocaleString()}</td>
            <td class="${ptClass}">${ptStr}</td>
        `;
        tbody.appendChild(tr);
    });

    generateShareText(playersData);
    const resultArea = document.getElementById('result-area');
    if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
}

function generateShareText(data) {
    const dateStr = new Date().toLocaleDateString('ja-JP');
    let text = `【麻雀対局結果】 ${dateStr}\n`;
    text += `ルール: ${currentRules.players}人打ち / ${currentRules.genten.toLocaleString()}持 ${currentRules.kaeshi.toLocaleString()}返\n`;
    text += `${'─'.repeat(30)}\n`;
    data.forEach(p => {
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        text += `${p.rank}位: ${p.name} ${p.score.toLocaleString()}点 (${ptStr})\n`;
    });
    text += `${'─'.repeat(30)}`;
    
    const shareBox = document.getElementById('share-text-box');
    if (shareBox) {
        shareBox.textContent = text;
    }
}

function copyShareText() {
    const text = document.getElementById('share-text-box')?.textContent;
    if (!text) {
        alert('コピーするテキストがありません。');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert('✓ 結果テキストをクリップボードにコピーしました！');
    }).catch(err => {
        console.error('コピーエラー:', err);
        alert('コピーに失敗しました。お手数ですが手動でコピーしてください。');
    });
}

// ========== 履歴管理 ==========
function saveToHistory() {
    if (!calculatedResults) {
        alert('計算結果がありません。');
        return;
    }

    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
        const newRecord = {
            id: Date.now(),
            date: new Date().toLocaleString('ja-JP'),
            playersCount: currentRules.players,
            rulesDesc: `${currentRules.genten}持-${currentRules.kaeshi}返 / ウマ ${currentRules.uma}`,
            scores: calculatedResults.map(p => ({
                name: p.name,
                score: p.score,
                pt: p.pt,
                rank: p.rank
            }))
        };

        history.unshift(newRecord);
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
        loadHistory();
        alert('✓ 対局履歴に保存しました。');
        switchTab('history-tab');
    } catch (error) {
        console.error('履歴保存エラー:', error);
        alert('履歴保存に失敗しました。');
    }
}

function loadHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
        const container = document.getElementById('history-list');
        if (!container) return;
        
        container.innerHTML = '';

        if (history.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 1rem;">📭 履歴はありません</p>';
            return;
        }

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            let scoreLine = '<div class="history-scores">';
            item.scores.forEach(s => {
                const ptStr = s.pt > 0 ? `+${s.pt.toFixed(1)}` : s.pt.toFixed(1);
                scoreLine += `
                    <div class="history-player">
                        <strong>${escapeHtml(s.name)}</strong><br>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${s.score.toLocaleString()}点</span><br>
                        <span class="${s.pt > 0 ? 'score-plus' : (s.pt < 0 ? 'score-minus' : '')}" style="font-weight:bold;">${ptStr}</span>
                    </div>
                `;
            });
            scoreLine += '</div>';

            div.innerHTML = `
                <div class="history-meta">
                    <span>📅 ${item.date} (${item.playersCount}人打)</span>
                    <span>${item.rulesDesc}</span>
                </div>
                ${scoreLine}
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('履歴読み込みエラー:', error);
    }
}

function clearHistory() {
    if (confirm('⚠️  すべての対局履歴を消去してもよろしいですか？')) {
        try {
            localStorage.removeItem(STORAGE_HISTORY_KEY);
            loadHistory();
            alert('✓ 履歴を消去しました。');
        } catch (error) {
            console.error('履歴削除エラー:', error);
            alert('履歴削除に失敗しました。');
        }
    }
}

// ========== ユーティリティ関数 ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
