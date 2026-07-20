// アプリ全体のグローバル状態
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

// アプリ起動時の初期処理
window.onload = function() {
    loadRulesFromStorage();
    initPlayerInputs();
    updateRuleDescription();
    loadHistory();
    setupRealtimeValidation();
};

// タブメニュー切り替え
function switchTab(tabId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const btnIndex = tabId === 'input-tab' ? 0 : (tabId === 'rule-tab' ? 1 : 2);
    document.querySelectorAll('.tab-btn')[btnIndex].classList.add('active');
}

// プレイヤー数に応じた入力欄の動的生成
function initPlayerInputs() {
    const container = document.getElementById('player-inputs-container');
    container.innerHTML = '';
    const count = parseInt(currentRules.players);
    const winds = ['東', '南', '西', '北'];

    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <div class="player-cell-wind">${winds[i]}</div>
            <div class="player-cell-name">
                <input type="text" id="p-name-${i}" value="プレイヤー${winds[i]}" placeholder="名前">
            </div>
            <div class="player-cell-score">
                <input type="number" id="p-score-${i}" class="p-score-input" value="" placeholder="持点(100点単位)" step="100">
            </div>
        `;
        container.appendChild(row);
    }
    setupRealtimeValidation();
}

function togglePlayerCount() {
    const select = document.getElementById('rule-players');
    currentRules.players = parseInt(select.value);
    initPlayerInputs();
}

// バリデーションと自動補完
function setupRealtimeValidation() {
    const inputs = document.querySelectorAll('.p-score-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateScores();
        });
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
        const val = document.getElementById(`p-score-${i}`).value;
        if (val !== "") {
            filledCount++;
            currentTotal += parseInt(val);
        } else {
            emptyIndex = i;
        }
    }

    const indicator = document.getElementById('validation-indicator');
    const calcBtn = document.getElementById('calc-btn');

    // 自動補完（残り1名のみ未入力のとき）
    if (filledCount === count - 1 && emptyIndex !== -1) {
        const autoScore = targetTotal - currentTotal;
        document.getElementById(`p-score-${emptyIndex}`).placeholder = `自動補完: ${autoScore}`;
    }

    // 合計整合性チェック
    if (filledCount === count) {
        if (currentTotal === targetTotal) {
            indicator.className = "indicator success";
            indicator.innerText = `合計点数チェックOK: ${currentTotal}点`;
            calcBtn.disabled = false;
            calcBtn.style.opacity = "1";
        } else {
            indicator.className = "indicator error";
            indicator.innerText = `点数が合いません: 現在合計 ${currentTotal}点 (目標 ${targetTotal}点 / 差額 ${targetTotal - currentTotal}点)`;
            calcBtn.disabled = true;
            calcBtn.style.opacity = "0.6";
        }
    } else {
        indicator.className = "indicator error";
        indicator.innerText = `全員の点数を入力してください (合計目標: ${targetTotal}点)`;
        calcBtn.disabled = true;
        calcBtn.style.opacity = "0.6";
    }
}

// ルール設定の保存
function saveRules() {
    currentRules.players = parseInt(document.getElementById('rule-players').value);
    currentRules.genten = parseInt(document.getElementById('rule-genten').value);
    currentRules.kaeshi = parseInt(document.getElementById('rule-kaeshi').value);
    currentRules.uma = document.getElementById('rule-uma').value;
    currentRules.rounding = document.getElementById('rule-rounding').value;
    currentRules.sameScore = document.getElementById('rule-same-score').value;
    currentRules.tobi = parseInt(document.getElementById('rule-tobi').value) || 0;
    currentRules.yakitori = parseInt(document.getElementById('rule-yakitori').value) || 0;

    localStorage.setItem('mj_calc_rules', JSON.stringify(currentRules));
    updateRuleDescription();
    initPlayerInputs();
    alert('ルール設定をブラウザに保存しました。');
    switchTab('input-tab');
}

function loadRulesFromStorage() {
    const saved = localStorage.getItem('mj_calc_rules');
    if (saved) {
        currentRules = JSON.parse(saved);
        document.getElementById('rule-players').value = currentRules.players;
        document.getElementById('rule-genten').value = currentRules.genten;
        document.getElementById('rule-kaeshi').value = currentRules.kaeshi;
        document.getElementById('rule-uma').value = currentRules.uma;
        document.getElementById('rule-rounding').value = currentRules.rounding;
        document.getElementById('rule-same-score').value = currentRules.sameScore;
        document.getElementById('rule-tobi').value = currentRules.tobi;
        document.getElementById('rule-yakitori').value = currentRules.yakitori;
    }
}

function updateRuleDescription() {
    document.getElementById('current-rule-desc').innerText = 
        `${currentRules.players}人打ち / ${currentRules.genten}点持 ${currentRules.kaeshi}点返 / ウマ(${currentRules.uma})`;
}

// 各種端数処理ロジック
function roundPoint(rawPoint, method) {
    if (method === 'keep') return Math.round(rawPoint * 10) / 10;
    let rounded = Math.round(rawPoint);
    
    if (method === '5sha6nyu') {
        // 五捨六入：小数第一位が0.5以下なら切り捨て、0.6以上なら切り上げ
        const sign = rawPoint >= 0 ? 1 : -1;
        const absVal = Math.abs(rawPoint);
        const fraction = absVal - Math.floor(absVal);
        if (fraction >= 0.5001 || fraction === 0.6) {
            rounded = Math.ceil(absVal) * sign;
        } else if (fraction <= 0.5) {
            rounded = Math.floor(absVal) * sign;
        } else {
            rounded = Math.round(rawPoint);
        }
    } else if (method === 'kirisute') {
        rounded = rawPoint >= 0 ? Math.floor(rawPoint) : Math.ceil(rawPoint);
    } else if (method === 'shishagonyu') {
        rounded = Math.round(rawPoint);
    }
    return rounded;
}

// ポイント精算の計算処理コア
function calculateScores() {
    const count = currentRules.players;
    let playersData = [];

    for (let i = 0; i < count; i++) {
        playersData.push({
            id: i,
            name: document.getElementById(`p-name-${i}`).value || `プレイヤー${i+1}`,
            score: parseInt(document.getElementById(`p-score-${i}`).value) || 0,
            initialIndex: i
        });
    }

    // 着順並び替え
    playersData.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (currentRules.sameScore === 'wind') return a.initialIndex - b.initialIndex;
        return 0;
    });

    let currentRank = 1;
    for (let i = 0; i < count; i++) {
        if (i > 0 && playersData[i].score < playersData[i-1].score) {
            currentRank = i + 1;
        }
        playersData[i].rank = currentRank;
    }

    // ウマ配列定義
    let umaArray = [0, 0, 0, 0];
    if (currentRules.uma === '5-10') umaArray = count === 4 ? [15, 5, -5, -15] : [15, 0, -15];
    if (currentRules.uma === '10-20') umaArray = count === 4 ? [20, 10, -10, -20] : [20, 0, -20];
    if (currentRules.uma === '10-30') umaArray = count === 4 ? [30, 10, -10, -30] : [30, 0, -30];
    if (currentRules.uma === '20-30') umaArray = count === 4 ? [30, 20, -20, -30] : [30, 0, -30];

    // 同着折半(split)か座順優先(wind)かでウマの配分を切り替え
    if (currentRules.sameScore === 'split') {
        let rankGroups = {};
        playersData.forEach(p => {
            if (!rankGroups[p.rank]) rankGroups[p.rank] = [];
            rankGroups[p.rank].push(p);
        });

        let idxPointer = 0;
        Object.keys(rankGroups).sort((a,b)=>a-b).forEach(r => {
            const group = rankGroups[r];
            let sumUma = 0;
            for(let k=0; k<group.length; k++) {
                sumUma += umaArray[idxPointer + k] || 0;
            }
            const avgUma = sumUma / group.length;
            group.forEach(p => { p.assignedUma = avgUma; });
            idxPointer += group.length;
        });
    } else {
        for (let i = 0; i < count; i++) {
            playersData[i].assignedUma = umaArray[i];
        }
    }

    // オカ（トップ賞）の計算
    const totalOkaPoints = ((currentRules.kaeshi - currentRules.genten) * count) / 1000;
    
    playersData.forEach((p, idx) => {
        let rawSoten = (p.score - currentRules.kaeshi) / 1000;
        p.pt = rawSoten + p.assignedUma;

        if (currentRules.sameScore === 'split') {
            const topCount = playersData.filter(x => x.rank === 1).length;
            if (p.rank === 1) p.pt += totalOkaPoints / topCount;
        } else {
            if (idx === 0) p.pt += totalOkaPoints;
        }

        p.pt = roundPoint(p.pt, currentRules.rounding);
    });

    // 端数処理誤差のゼロサム微調整（最下位プレイヤーのスコアに集約）
    let totalPt = 0;
    playersData.forEach(p => totalPt += p.pt);
    if (totalPt !== 0 && currentRules.rounding !== 'keep') {
        playersData[count - 1].pt = Math.round((playersData[count - 1].pt - totalPt) * 10) / 10;
    }

    calculatedResults = playersData;

    // 結果表示テーブル描画
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    
    playersData.forEach((p, i) => {
        const tr = document.createElement('tr');
        const ptClass = p.pt > 0 ? 'score-plus' : (p.pt < 0 ? 'score-minus' : '');
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        
        tr.innerHTML = `
            <td class="rank-${p.rank}">${p.rank}位</td>
            <td>${p.name}</td>
            <td>${p.score}</td>
            <td class="${ptClass}">${ptStr}</td>
        `;
        tbody.appendChild(tr);
    });

    generateShareText(playersData);
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('result-area').scrollIntoView({ behavior: 'smooth' });
}

function generateShareText(data) {
    const dateStr = new Date().toLocaleDateString();
    let text = `【麻雀対局結果】 ${dateStr}\n`;
    text += `ルール: ${currentRules.players}人打ち / ${currentRules.kaeshi}返\n`;
    text += `---------------------------\n`;
    data.forEach(p => {
        const ptStr = p.pt > 0 ? `+${p.pt.toFixed(1)}` : p.pt.toFixed(1);
        text += `${p.rank}位: ${p.name} ${p.score}点 (${ptStr})\n`;
    });
    text += `---------------------------`;
    document.getElementById('share-text-box').innerText = text;
}

function copyShareText() {
    const text = document.getElementById('share-text-box').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert('結果テキストをクリップボードにコピーしました！');
    }).catch(err => {
        alert('コピーに失敗しました。');
    });
}

// 履歴管理機能 (LocalStorage)
function saveToHistory() {
    if (!calculatedResults) return;

    const history = JSON.parse(localStorage.getItem('mj_calc_history') || '[]');
    const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        playersCount: currentRules.players,
        rulesDesc: `${currentRules.genten}持-${currentRules.kaeshi}返 / ウマ ${currentRules.uma}`,
        scores: calculatedResults.map(p => ({ name: p.name, score: p.score, pt: p.pt, rank: p.rank }))
    };

    history.unshift(newRecord);
    localStorage.setItem('mj_calc_history', JSON.stringify(history));
    loadHistory();
    alert('対局履歴に保存しました。');
    switchTab('history-tab');
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('mj_calc_history') || '[]');
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">履歴はありません</p>';
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
                    <strong>${s.name}</strong><br>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${s.score}</span><br>
                    <span class="${s.pt > 0 ? 'score-plus' : (s.pt < 0 ? 'score-minus' : '')}" style="font-weight:bold;">${ptStr}</span>
                </div>
            `;
        });
        scoreLine += '</div>';

        div.innerHTML = `
            <div class="history-meta">
                <span>${item.date} (${item.playersCount}人打)</span>
                <span>${item.rulesDesc}</span>
            </div>
            ${scoreLine}
        `;
        container.appendChild(div);
    });
}

function clearHistory() {
    if (confirm('すべての対局履歴を消去してもよろしいですか？')) {
        localStorage.removeItem('mj_calc_history');
        loadHistory();
    }
}