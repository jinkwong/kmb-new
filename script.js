// 選取元素
let routeSearchedList = document.querySelector(".routeSearchedList");
let searchbox = document.querySelector("#routeInput");
let searchBtn = document.querySelector("#searchBtn");
let stopID_name = {};
let stopSearchedList = document.querySelector(".stopList");
let alertContainer = document.querySelector(".alertContainer");
let suggestionsBox = document.querySelector("#suggestions");
let historyList = document.querySelector("#historyList");
let allRoutes = [];

// 獲取所有停靠站點的名稱
window.addEventListener("load", async () => {
  try {
    const stopNamesResponse = await axios("https://data.etabus.gov.hk/v1/transport/kmb/stop");
    stopNamesResponse.data.data.forEach(stop => {
      stopID_name[stop.stop] = stop.name_tc;
    });

    const routeNamesResponse = await axios("https://data.etabus.gov.hk/v1/transport/kmb/route/");
    allRoutes = routeNamesResponse.data.data.map(route => route.route);
  } catch (error) {
    console.error(error);
  }

  loadHistory();
});

// 顯示提醒消息
function showAlert(message) {
  alertContainer.innerHTML = "";
  const alertMessage = document.createElement("div");
  alertMessage.className = "alertMessage";
  alertMessage.innerHTML = message;
  alertContainer.appendChild(alertMessage);
}

// 查詢路線
async function searchRoute() {
  routeSearchedList.innerHTML = "";
  stopSearchedList.innerHTML = "";
  alertContainer.innerHTML = "";

  try {
    const response = await axios("https://data.etabus.gov.hk/v1/transport/kmb/route/");
    const routes = response.data.data;
    const routeChecked = routes.filter(route => route.route === searchbox.value.toUpperCase());

    if (routeChecked.length === 0) {
      showAlert("未找到該路線，請檢查輸入是否正確。");
      return;
    }

    // 保存查詢記錄
    saveHistory(searchbox.value.toUpperCase());

    // 顯示查詢到的路線
    routeChecked.forEach((route, i) => {
      const routeSearched = document.createElement("button");
      routeSearched.id = `routeNumber-${i}`;
      routeSearched.innerHTML = `${route.orig_tc} -> ${route.dest_tc}`;
      routeSearchedList.appendChild(routeSearched);

      // 點擊路線顯示停靠站點
      routeSearched.addEventListener("click", async () => {
        stopSearchedList.innerHTML = "";
        const routeboundConverted = route.bound === "O" ? "outbound" : "inbound";

        try {
          const stopResponse = await axios(
            `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route.route}/${routeboundConverted}/${route.service_type}`
          );

          stopResponse.data.data.forEach(stopInfo => {
            const stopName = stopID_name[stopInfo.stop];
            if (stopName) {
              const stopContainer = document.createElement("div");
              stopContainer.className = "stopContainer";

              const stopCreate = document.createElement("div");
              stopCreate.className = "stopNumber";
              stopCreate.innerHTML = stopName;
              stopContainer.appendChild(stopCreate);

              const etaList = document.createElement("div");
              etaList.className = "etaList";
              stopContainer.appendChild(etaList);

              stopSearchedList.appendChild(stopContainer);

              // 滑鼠移動到停靠站點顯示 ETA
              stopCreate.addEventListener("mouseover", async () => {
                // 隱藏所有其他的 etaLists
                document.querySelectorAll('.etaList').forEach(el => el.style.display = 'none');
                etaList.innerHTML = "";

                try {
                  const etaResponse = await axios(
                    `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopInfo.stop}`
                  );

                  etaResponse.data.data
                    .filter(eta => eta.route === route.route)
                    .forEach(eta => {
                      const etaItem = document.createElement("div");
                      etaItem.className = "etaItem";
                      etaItem.innerHTML = `
                        <span>巴士路線 : ${eta.route}</span>
                        <span>預計到站時間: ${new Date(eta.eta).toLocaleTimeString()}</span>
                      `;
                      etaList.appendChild(etaItem);
                    });

                  etaList.style.display = 'block';
                } catch (error) {
                  console.error(error);
                }
              });

              // 滑鼠移出停靠站點隱藏 ETA
              stopCreate.addEventListener("mouseout", () => {
                etaList.style.display = 'none';
              });
            }
          });
        } catch (error) {
          console.error(error);
        }
      });
    });
  } catch (error) {
    console.error(error);
  }
}

// 自動完成建議
searchbox.addEventListener("input", () => {
  const input = searchbox.value.toUpperCase();
  suggestionsBox.innerHTML = "";
  if (input) {
    const suggestions = allRoutes.filter(route => route.startsWith(input));
    suggestions.forEach(suggestion => {
      const suggestionItem = document.createElement("div");
      suggestionItem.className = "suggestion-item";
      suggestionItem.innerHTML = suggestion;
      suggestionItem.addEventListener("click", () => {
        searchbox.value = suggestion;
        suggestionsBox.innerHTML = "";
      });
      suggestionsBox.appendChild(suggestionItem);
    });
  }
});

// 保存查詢歷史
function saveHistory(route) {
  let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
  if (!history.includes(route)) {
    history.push(route);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    loadHistory();
  }
}

// 加載查詢歷史
function loadHistory() {
  historyList.innerHTML = "";
  let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
  history.forEach(route => {
    const historyItem = document.createElement("li");
    historyItem.innerHTML = route;
    historyItem.addEventListener("click", () => {
      searchbox.value = route;
      searchRoute();
    });
    historyList.appendChild(historyItem);
  });
}

// 監聽查詢按鈕的點擊事件
searchBtn.addEventListener("click", searchRoute);

// 監聽輸入框的鍵盤事件，按下 Enter 鍵時觸發查詢
searchbox.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchRoute();
  }
});
