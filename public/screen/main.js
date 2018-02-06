'use strict';

document.addEventListener('DOMContentLoaded', function() {
    var sessionId = setupSession();
    function setupSession() {
        var sessionId = sessionIdFromUrl() || generateSessionId();
        history.replaceState(undefined, '', '?' + sessionId);
        return sessionId;

        function generateSessionId() {
            return [1, 2, 3, 4, 5, 6].map(n => {
                var code = Math.floor(Math.random() * 25) + 65;
                var letter = String.fromCharCode(code);
                return letter;
            }).join('');
        }

        function sessionIdFromUrl() {
            var id = location.search.substring(1).toUpperCase();
            return id.length > 0 ? id : null;
        }
    }

    enableFullscreenButton();
    function enableFullscreenButton() {
        var button = document.getElementById('fullscreen-button');
        button.onclick = () => {
            requestFullscreen(document.documentElement);
        };

        var prefixes = ['', 'moz', 'ms', 'webkit'];
        var events = prefixes.map(p => 'on' + p + 'fullscreenchange');
        var event = events.filter(p => p in document)[0];
        document[event] = () => {
            var properties = [
                'fullscreenElement',
                'mozFullscreenElement',
                'mozFullScreenElement',
                'msFullscreenElement',
                'msFullScreenElement',
                'webkitFullscreenElement',
                'webkitFullScreenElement',
            ];
            var isFullscreen = properties.some(p => Boolean(document[p]));
            document.documentElement.classList.toggle('fullscreen', isFullscreen);
        };

        function requestFullscreen(element) {
            var methods = [
                'requestFullscreen',
                'mozRequestFullscreen',
                'mozRequestFullScreen',
                'msRequestFullscreen',
                'msRequestFullScreen',
                'webkitRequestFullscreen',
                'webkitRequestFullScreen',
            ];
            var method = methods.filter(m => m in element)[0];
            element[method]();
        }
    }

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

    var addMicroblogPost = () => {};
    enableMicroblog();

    function enableMicroblog() {
        var container = document.querySelector('.microblog-post-list');
        var template = document.querySelector('.microblog-post');
        container.removeChild(template);
        template.hidden = false;
        container.classList.add('blank');

        // Once the animation ends on the previous post, remove it.
        container.addEventListener('animationend', event => {
            if (event.target.classList.contains('in')) {
                if (event.target !== event.target.parentNode.lastElementChild) {
                    event.target.parentNode.removeChild(event.target);
                }
            }
            else {
                event.target.classList.add('in');
            }
        });

        var playSound = createExclusiveSound('microblog.ogg', 0.5);
        addMicroblogPost = (microblog) => {
            container.classList.remove('blank');
            var node = template.cloneNode(true);
            node.querySelector('.microblog-author-name').textContent = microblog.author;
            node.querySelector('.microblog-author-location').textContent = microblog.location;
            node.querySelector('.microblog-post-body p').textContent = microblog.text;
            node.querySelector('.microblog-author-portrait').src = microblog.portrait;
            container.appendChild(node);

            playSound();
        };

        function randomValue(array) {
            return array[Math.floor(Math.random() * array.length)];
        }
    }

    [].slice.call(document.querySelectorAll('[data-join-link]')).forEach(e => {
        e.href = location.protocol + '//' + location.host + '/' + sessionId;
        e.textContent = location.host + '/' + sessionId;
    });

    startTicker(document.querySelector('.ticker-list'), 50);

    function startTicker(template, pixelsPerSecond) {
        var container = template.parentNode;
        // We remove the template because we want to add all the elements at the
        // same time to ensure that the animations also start at the same time.
        // (As far as I can tell, the animation on the template can otherwise
        // start running before the JavaScript runs, causing a mismatch between
        // the template and the clones.)
        container.removeChild(template);

        fillTicker();

        function fillTicker() {
            while (roomLeft()) {
                var items = currentItems();
                var lastItem = items[items.length - 1];
                var newItem = template.cloneNode(true);
                container.appendChild(newItem);
            }

            // Make sure the animation resets whenever we might have added new
            // ticker items. We use a timeout to ensure that the reset takes
            // effect, although there might be other ways to do it.
            currentItems().forEach(item => {
                item.style.animationName = 'none';
            });

            setTimeout(() => {
                currentItems().forEach(item => {
                    item.style.animationName = '';
                });
            }, 0);
        }

        function roomLeft() {
            var items = currentItems();
            var lastItem = items[items.length - 1];
            return !lastItem || lastItem.getBoundingClientRect().left < window.innerWidth;
        }

        function currentItems() {
            return [].slice.call(container.children);
        }

        window.addEventListener('resize', event => {
            fillTicker();
        });
    }

    var changeHeadline = () => {};
    enableHeadline();
    changeHeadline('Zap: Telling Stories Through News');

    function enableHeadline() {
        var template = document.querySelector('.headline');
        var container = template.parentNode;
        template.remove();
        var playSound = createExclusiveSound('headline.ogg', 0.5);

        changeHeadline = headline => {
            var clone = template.cloneNode(true);
            clone.textContent = headline;
            container.appendChild(clone);
            if (clone.previousElementSibling) clone.previousElementSibling.hidden = true;

            clone.addEventListener('animationend', () => {
                if (clone.hidden) {
                    clone.remove();
                    playSound();
                }
            });
        };
    }

    function createExclusiveSound(url, volume) {
        var sound = new Audio(url);
        sound.volume = volume;

        return () => {
            if (sound.paused) {
                sound.currentTime = 0;
                sound.play();
            }
        };
    }

    hideMouseOnIdle();

    function hideMouseOnIdle() {
        var timer = null;
        document.addEventListener('mousemove', event => {
            clearTimeout(timer);
            document.documentElement.classList.remove('idle');
            timer = setTimeout(() => {
                document.documentElement.classList.add('idle');
            }, 1000);
        });
    }

    connectToBroadcast('wss://tabletopsoftware.herokuapp.com/' + sessionId, event => {
        if (event.data === 'ping') return;
        if (event.data === 'join') return;
        var payload = JSON.parse(event.data);

        if ('microblog' in payload) addMicroblogPost(payload.microblog);
        else {
            var text = payload.change.trim();
            if (text.length > 0) changeHeadline(text);
        }
    });

    function connectToBroadcast(url, onMessage) {
        return new Promise(resolve => {
            var socket = createSocket();
            socket.onopen = () => {
                setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send('ping');
                    }
                    else if (socket.readyState === WebSocket.CLOSED) {
                        console.log('Socket closed; reconnecting...');
                        socket = createSocket();
                    }
                }, 1000);

                resolve(message => {
                    socket.send(
                        typeof message === 'string'
                        ? message
                        : JSON.stringify(message)
                    );
                });
            }

            function createSocket() {
                var socket = new WebSocket(url);
                socket.onmessage = onMessage;
                return socket;
            }
        });
    }
});
