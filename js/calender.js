const week = ["日", "月", "火", "水", "木", "金", "土"];
const today = new Date();
var showDate = new Date(today.getFullYear(), today.getMonth(), 1);
var dataStore = {};  // データを保存するオブジェクト



// 前の月表示
function prev(){
    showDate.setMonth(showDate.getMonth() - 1);
    showProcess(showDate);
}

// 次の月表示
function next(){
    showDate.setMonth(showDate.getMonth() + 1);
    showProcess(showDate);
}

// カレンダー表示
function showProcess(date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    document.querySelector('#header').innerHTML = year + "年 " + (month + 1) + "月";

    var calendar = createProcess(year, month);
    document.querySelector('#calendar').innerHTML = calendar;
}

// カレンダー作成
function createProcess(year, month) {
    var calendar = "<table><tr class='dayOfWeek'>";
    for (var i = 0; i < week.length; i++) {
        calendar += "<th>" + week[i] + "</th>";
    }
    calendar += "</tr>";

    var count = 0;
    var startDayOfWeek = new Date(year, month, 1).getDay();
    var endDate = new Date(year, month + 1, 0).getDate();
    var lastMonthEndDate = new Date(year, month, 0).getDate();
    var row = Math.ceil((startDayOfWeek + endDate) / week.length);

    // 1行ずつ設定
    for (var i = 0; i < row; i++) {
        calendar += "<tr>";
        for (var j = 0; j < week.length; j++) {
            if (i == 0 && j < startDayOfWeek) {
                calendar += "<td class='disabled'>" + (lastMonthEndDate - startDayOfWeek + j + 1) + "</td>";
            } else if (count >= endDate) {
                count++;
                calendar += "<td class='disabled'>" + (count - endDate) + "</td>";
            } else {
                count++;
                var fullDate = year + "-" + (month + 1) + "-" + count;

                // 今日の日付と一致するかをチェック
                var isToday = (fullDate === today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate()) ? ' today' : '';

                // 喫煙本数の合計を取得
                let totalCigarettes = 0;
                if (dataStore[fullDate]) {
                    totalCigarettes = dataStore[fullDate].reduce((sum, entry) => sum + parseInt(entry.cigarettes), 0);
                }

                calendar += `<td class='calendar_td${isToday}' data-date='${fullDate}'>${count}`;
                if (totalCigarettes > 0) {
                    calendar += `<div class='total-cigarettes'>合計: ${totalCigarettes}本</div>`;
                }
                calendar += "</td>";
            }
        }
        calendar += "</tr>";
    }
    return calendar;
}
    
// モーダル操作
var modal = document.getElementById("modal");
var span = document.getElementsByClassName("close")[0];
span.onclick = function() {
    modal.style.display = "none";
};
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

// モーダル内に保存されている記録を表示
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("calendar_td")) {
        var selectedDate = e.target.dataset.date;
        document.getElementById("modal-date").innerText = selectedDate;
        modal.style.display = "block";

        // フォームをリセット
        document.getElementById("cigarettes").value = "";
        document.getElementById("time").value = "";
        document.getElementById("situation").value = "朝起きてすぐ";
        document.getElementById("other-situation").value = "";
        document.getElementById("other-situation-container").style.display = "none";

        // その日の記録を表示
        displaySmokingRecords(selectedDate);

        // 状況が「その他」の場合の処理
        document.getElementById("situation").onchange = function() {
            if (this.value === "その他") {
                document.getElementById("other-situation-container").style.display = "block";
            } else {
                document.getElementById("other-situation-container").style.display = "none";
            }
        };

        // 保存ボタンの処理
        document.getElementById("save").onclick = function() {
            var cigarettes = document.getElementById("cigarettes").value;
            var time = document.getElementById("time").value;
            var situation = document.getElementById("situation").value;
            if (situation === "その他") {
                situation = document.getElementById("other-situation").value;
            }
        
            if (!dataStore[selectedDate]) {
                dataStore[selectedDate] = [];
            }
        
            // 喫煙データを追加
            dataStore[selectedDate].push({ cigarettes: cigarettes, time: time, situation: situation });
        
            // ローカルストレージに保存
            saveData();  // データを保存
        
            modal.style.display = "none";
            showProcess(showDate);  // カレンダーを再描画
        };
    }
});

// 喫煙記録をモーダルに表示
function displaySmokingRecords(date) {
    var recordContainer = document.getElementById("smoking-records");
    recordContainer.innerHTML = "";  // 表示エリアをクリア

    if (dataStore[date]) {
        dataStore[date].forEach(function(record, index) {
            var recordDiv = document.createElement("div");
            recordDiv.classList.add("record-item");
            recordDiv.innerHTML = `
                <p>喫煙本数: ${record.cigarettes}本</p>
                <p>時間: ${record.time}</p>
                <p>状況: ${record.situation}</p>
                <button class="delete-btn" data-date="${date}" data-index="${index}">削除</button>
            `;
            recordContainer.appendChild(recordDiv);
        });
    } else {
        recordContainer.innerHTML = "<p>記録はありません。</p>";
    }
}

// 削除ボタンの処理
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("delete-btn")) {
        var date = e.target.dataset.date;
        var index = e.target.dataset.index;

        // 該当データを削除
        dataStore[date].splice(index, 1);

        // データが空になった場合、その日付のデータを削除
        if (dataStore[date].length === 0) {
            delete dataStore[date];
        }

        // 喫煙記録を再表示
        displaySmokingRecords(date);

        // データ保存
        saveData();

        showProcess(showDate);  // カレンダーを再描画
    }
});

// 血中酸素濃度データ保存用オブジェクト
var oxygenDataStore = {};

// グラフ描画のためのChart.jsを利用
var ctx = document.getElementById('oxygen-chart').getContext('2d');
var chart;

// グラフを描画する関数
function drawOxygenChart() {
    // グラフの横軸（日付）と縦軸（酸素濃度）データの準備
    var labels = Object.keys(oxygenDataStore).sort(); // 日付を昇順で取得
    var data = labels.map(function(date) {
        return oxygenDataStore[date];
    });

    // すでにチャートが存在する場合はアップデート
    if (chart) {
        chart.destroy();  // 前のグラフを破棄
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '血中酸素濃度 (%)',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                borderWidth: 2,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    min: 93,
                    max: 100,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: '血中酸素濃度 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日付'
                    }
                }
            }
        }
    });
}

// 血中酸素濃度データを保存するイベント
document.getElementById("save-oxygen").onclick = function() {
    var date = document.getElementById("oxygen-date").value;
    var level = parseFloat(document.getElementById("oxygen-level").value);

    if (!date || isNaN(level)) {
        alert("有効な日付と血中酸素濃度を入力してください");
        return;
    }

    // データを保存
    oxygenDataStore[date] = level;

    // グラフを再描画
    drawOxygenChart();
};



  // 対処法データ
  var tipsData = {
    irritable: [
      "深呼吸をする",
      "冷たい氷水や熱いお茶を飲む",
      "散歩や体操などの軽い運動",
      "瞑想"
    ],
    mouth: [
      "ガム(糖分の少ない物)や干昆布をかむ",
      "歯をみがく"
    ],
    hands: [
      "机の引き出しなどの整理をする",
      "プラモデルの制作や庭仕事などをする"
    ],
    others: [
      "音楽を聴く",
      "時計を見て吸いたい衝動がおさまるまで秒数をかぞえる"
    ]
  };

 // 対処法モーダル
 var tipsModal = document.getElementById("tips-modal");
 var tipsList = document.getElementById("tips-list");
 var closeTipsBtn = document.getElementsByClassName("close-tips")[0];
 var addTipBtn = document.getElementById("add-tip-btn");
 var newTipInput = document.getElementById("new-tip");
 var currentCategory = '';
 
// ローカルストレージにデータを保存
function saveTipsData() {
    localStorage.setItem('tipsData', JSON.stringify(tipsData));
  }
  
  // ローカルストレージからデータを読み込む
  function loadTipsData() {
    var savedData = localStorage.getItem('tipsData');
    if (savedData) {
      tipsData = JSON.parse(savedData);
    } else {
      tipsData = defaultTipsData; // デフォルトデータを使用
    }
  }
  

  // カテゴリーボタンの処理
  document.querySelectorAll(".category-btn").forEach(function(button) {
    button.onclick = function() {
      currentCategory = button.getAttribute("data-category");
      showTips(currentCategory);
    };
  });
  
  // 対処法を表示する関数
  function showTips(category) {
    // リストをクリア
    tipsList.innerHTML = "";
  
    // 選択されたカテゴリーの対処法をリストに追加
    tipsData[category].forEach(function(tip) {
      var listItem = document.createElement("li");
      listItem.textContent = tip;
      tipsList.appendChild(listItem);
    });
  
    // モーダルを表示
    tipsModal.style.display = "block";
  }
  
  // モーダルを閉じる処理
  closeTipsBtn.onclick = function() {
    tipsModal.style.display = "none";
  };
  
  window.onclick = function(event) {
    if (event.target == tipsModal) {
      tipsModal.style.display = "none";
    }
  }
  
// 対処法を追加する処理
addTipBtn.onclick = function() {
    var newTip = newTipInput.value.trim();
    if (newTip) {
        // 新しい対処法をデータに追加
        tipsData[currentCategory].push(newTip);
        newTipInput.value = ""; // 入力フィールドをクリア
        showTips(currentCategory); // リストを更新
        saveData(); // データを保存
    }
};



// データをローカルストレージに保存する関数
function saveData() {
    // 喫煙データ、酸素データ、対処法データをローカルストレージに保存
    localStorage.setItem('dataStore', JSON.stringify(dataStore));
    localStorage.setItem('oxygenDataStore', JSON.stringify(oxygenDataStore));
    localStorage.setItem('tipsData', JSON.stringify(tipsData));
}


// ページがアンロードされる前にデータを保存
window.addEventListener('beforeunload', saveData);

// データをローカルストレージから読み込む関数
function loadData() {
    var savedDataStore = localStorage.getItem('dataStore');
    var savedOxygenDataStore = localStorage.getItem('oxygenDataStore');
    var savedTipsData = localStorage.getItem('tipsData');

    // ローカルストレージに保存されたデータを適切にロード
    if (savedDataStore) {
        dataStore = JSON.parse(savedDataStore);
    }

    if (savedOxygenDataStore) {
        oxygenDataStore = JSON.parse(savedOxygenDataStore);
    }

    if (savedTipsData) {
        tipsData = JSON.parse(savedTipsData);
    }
}





// 喫煙データを24時間単位で集計する関数
function getSmokingDataForChart() {
    let hourlyData = Array(24).fill(0);  // 24時間の配列を初期化

    // データストアから喫煙データを取得
    for (let date in dataStore) {
        dataStore[date].forEach(entry => {
            const time = entry.time;  // 時間 (HH:MM形式)
            const hour = parseInt(time.split(":")[0]);  // 時間部分を取得して整数に変換
            hourlyData[hour] += parseInt(entry.cigarettes);  // 喫煙本数を対応する時間帯に加算
        });
    }

    return hourlyData;
}

// 喫煙本数のグラフを描画する関数
function drawSmokingChart() {
    // 喫煙データを取得
    var hourlyData = getSmokingDataForChart();

    // グラフ描画用のctx取得
    var ctx = document.getElementById('smoking-chart').getContext('2d');

    // Chart.jsを使用してグラフを描画
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),  // 24時間をラベルに
            datasets: [{
                label: '喫煙本数',
                data: hourlyData,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '喫煙本数'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '時間'
                    }
                }
            }
        }
    });
}

// ページが読み込まれたときに呼び出す処理
window.onload = function () {
    loadData();  // データをローカルストレージから読み込む
    showProcess(today,calendar);  // カレンダーを表示
    drawOxygenChart(); // グラフを描画
    drawSmokingChart();  // 喫煙本数のグラフを描画
};




