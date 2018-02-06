'use strict';

window.addEventListener('load', function() {
    updateClock();
    setInterval(updateClock, 1000);

    function updateClock() {
        var date = new Date();
        var hours = date.getHours();
        var hoursText = hours >= 10 ? hours : '0' + hours;
        var minutes = date.getMinutes();
        var minutesText = minutes >= 10 ? minutes : '0' + minutes;
        document.getElementById('clock').textContent = hoursText + ':' + minutesText;
    }
});
