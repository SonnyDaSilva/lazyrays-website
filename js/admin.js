const BASE_URL = "https://api.lazyrays.co.uk"

async function fetchWithAuth(url, password) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${password}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Fetch error: " + error.message);
  }
}

async function fetchData() {
  const password = document.getElementById('adminPassword').value;
  const isAuthenticated = await fetchWithAuth(BASE_URL+`/auth`, password);
  if (isAuthenticated && isAuthenticated.authenticated) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('graphsSection').style.display = 'block';

    const urls = [
      BASE_URL+'/games',
      BASE_URL+'/playtimes',
      BASE_URL+'/ratings'
    ];
    
    const promises = urls.map(url => fetchWithAuth(url, password));
    const [games, playtimes, ratings] = await Promise.all(promises);
    const gamesKey = games.reduce((acc, game) => ({...acc, [game.id]: game.name}), {});
    processAndChart(gamesKey, playtimes, ratings);
    let most_recent_playtimes = []
    Object.keys(playtimes['game_id']).forEach(gameId => {
      most_recent_playtimes.push(playtimes['game_id'][gameId].pop())
    })
    console.log("mostrecent", most_recent_playtimes)
    displayEstimatedRevenues(games,most_recent_playtimes)
  } else {
    alert('Incorrect password or authentication failed');
  }
}

function processAndChart(gamesKey, playtimesData, ratingsData) {
  const ratingLabels = [];
  const ratingDatasets = [];
  Object.keys(ratingsData['game_id']).forEach(gameId => {
    const gameRatings = ratingsData['game_id'][gameId];
    const studentRatings = gameRatings.map(rating => rating.avg_student_rating);
    const teacherRatings = gameRatings.map(rating => rating.avg_teacher_rating);
    const labels = gameRatings.map(rating => rating.date);
    
    if (labels.length > ratingLabels.length) {
      ratingLabels.splice(0, ratingLabels.length, ...labels);
    }

    const studentCol = generateColor()
    const teacherCol = darkenColor(studentCol)

    ratingDatasets.push({
      label: `${gamesKey[gameId]} - Student Ratings`,
      data: studentRatings,
      borderColor: studentCol,
      fill: false,
    });
    ratingDatasets.push({
      label: `${gamesKey[gameId]} - Teacher Ratings`,
      data: teacherRatings,
      borderColor: teacherCol,
      fill: false,
    });
  });


  const playtimeLabels = [];
  const playtimeDatasets = [];

  Object.keys(playtimesData['game_id']).forEach(gameId => {
    const gamePlaytimes = playtimesData['game_id'][gameId];
    const playtimes = gamePlaytimes.map(playtime => playtime.percentage_playtime * 100);
    const labels = gamePlaytimes.map(playtime => playtime.date);

    if (labels.length > playtimeLabels.length) {
      playtimeLabels.splice(0, playtimeLabels.length, ...labels);
    }

    playtimeDatasets.push({
      label: `${gamesKey[gameId]} - Playtime (%)`,
      data: playtimes,
      borderColor: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
      fill: false,
    });
  });

  // Create the ratings chart
  const ctxRatings = document.getElementById('ratingsGraph').getContext('2d');
  new Chart(ctxRatings, {
    type: 'line',
    data: {
      labels: ratingLabels,
      datasets: ratingDatasets,
    },
    legend: {
      display: true,
      position: 'top', // Ensure the legend is at the top
    },
    options: {
      layout: {
        padding: {
          top: 30,
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });

  // Create the playtime chart
  const ctxPlaytime = document.getElementById('playtimeGraph').getContext('2d');
  new Chart(ctxPlaytime, {
    type: 'line',
    data: {
      labels: playtimeLabels,
      datasets: playtimeDatasets,
    },
    options: {
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

function displayEstimatedRevenues(games, most_recent_playtimes) {
  const estimatedPayoutsElement = document.getElementById('estimatedPayouts');
  let totalRevenue = 0;

  most_recent_playtimes.forEach(playtime => {
      const game = getGame(games, playtime.game_id);
      const estimatedRevenue = playtimeToEstimate(playtime, game);
      totalRevenue += estimatedRevenue;

      const gameRevenueElement = document.createElement('div');
      gameRevenueElement.textContent = `${game.name}: $${estimatedRevenue.toFixed(2)}`;
      estimatedPayoutsElement.appendChild(gameRevenueElement);
  });

  document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
}

function playtimeToEstimate(playtime, game, lolRevenue=290000) {
  console.log("playtime in func", playtime)
  console.log("game in func", game)
  let multiplyier = 0
  if (game.subject == "math"){
    multiplyier = 0.45
  } else {
    multiplyier = 0.55
  }
  console.log("mul", multiplyier)
  return playtime.percentage_playtime * lolRevenue * multiplyier;
}

function getGame(games, targetId) {
  for (let i = 0; i < games.length; i++) {
    if (games[i].id == targetId) {
      return games[i];
    }
  }
}

document.getElementById('adminPassword').addEventListener('keypress', function(event) {
  if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector('#loginSection button').click();
  }
});



function generateColor() {
  const baseColor = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
  return baseColor;
}

function darkenColor(rgbColor, amount = 0.9) {
  let [r, g, b] = rgbColor.match(/\d+/g).map(Number); // Extract RGB values from the string
  r = Math.floor(r * amount);
  g = Math.floor(g * amount);
  b = Math.floor(b * amount);
  return `rgb(${r}, ${g}, ${b})`;
}