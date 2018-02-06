'use strict';

window.addEventListener('load', function() {
    enableHeadlineForm();

    function enableHeadlineForm() {
        var input = document.querySelector('.headline-input');
        var template = input.cloneNode(true);
        makeEditable(input, onSubmit);
        input.focus();

        document.getElementById('headline-form').onsubmit = event => {
            event.preventDefault();
            onSubmit();
        };

        function onSubmit() {
            var text = input.textContent.trim();
            clearElement(input);
            input.focus();

            if (text.length > 0) {
                broadcast({change: text});
                var clone = template.cloneNode(true);
                clone.textContent = text;
                input.parentNode.insertBefore(clone, input.nextElementSibling);
                clone.addEventListener('animationend', () => clone.remove());
            }
        }
    }

    enableMicroblogForm();

    function enableMicroblogForm() {
        var nodes = {
            microblog: document.querySelector('.microblog'),
            input: document.querySelector('.microblog-input'),
            author: document.querySelector('.microblog-author-name'),
            location: document.querySelector('.microblog-author-location'),
            portrait: document.querySelector('.microblog-author-portrait'),
            random: document.querySelector('.microblog-random-author-button'),
        };
        var template = nodes.microblog.cloneNode(true);

        makeEditable(nodes.input, onSubmit);
        makeEditable(nodes.author, () => nodes.location.focus());
        makeEditable(nodes.location, () => nodes.input.focus());

        enableMicroblogPortrait(nodes.portrait);
        enableRandomMicroblogUser();

        document.getElementById('microblog-form').onsubmit = event => {
            event.preventDefault();
            onSubmit();
        };

        function onSubmit() {
            var microblog = {
                text: nodes.input.textContent.trim(),
                author: nodes.author.textContent.trim(),
                location: nodes.location.textContent.trim(),
                portrait: nodes.portrait.src,
            };

            clearElement(nodes.input);
            nodes.input.focus();

            if (microblog.text.length > 0) {
                broadcast({microblog: microblog});
                var clone = template.cloneNode(true);
                clone.querySelector('.microblog-input').textContent = microblog.text;
                clone.querySelector('.microblog-author-name').textContent = microblog.author;
                clone.querySelector('.microblog-author-location').textContent = microblog.location;
                clone.querySelector('.microblog-author-portrait').src = microblog.portrait;
                nodes.microblog.parentNode.insertBefore(clone, nodes.microblog.nextElementSibling);
                clone.addEventListener('animationend', () => clone.remove());
            }
        }

        function enableRandomMicroblogUser() {
            var names = {male: ['John'], family: ['Doe']};
            fetchJson('../names.json', newNames => names = newNames);

            var cities = [{name: 'Washington', state: 'District of Columbia'}];
            fetchJson('../cities.json', newCities => cities = newCities);

            var states = {'DC': 'District of Columbia'};
            fetchJson('../states.json', newStates => states = newStates);

            nodes.random.onclick = () => {
                var gender = randomValue(['male', 'female']);

                var userName = randomValue(names[gender]) + randomValue(names.family);
                var city = randomValue(cities);
                var cityName = city.name;
                var stateName = city.state;
                var stateAbbr = Object.keys(states).filter(abbr => states[abbr] === stateName)[0];

                setElement(nodes.author, '@' + userName);
                setElement(nodes.location, cityName + ', ' + stateAbbr);

                // For simplicity, we hardcode the number of available random
                // portraits. TODO: Change to be dynamic if/when needed.
                var portraitCount = {
                    male: 120,
                    female: 119,
                };
                var portraitNumber = Math.floor(Math.random() * portraitCount[gender]) + 1;
                nodes.portrait.src = 'portraits/' + gender + '/' + portraitNumber + '.png';
            };
        }

        function randomValue(array) {
            return array[Math.floor(Math.random() * array.length)];
        }

        function fetchJson(url, onLoad) {
            return fetch(url).then(response => response.json()).then(onLoad);
        }
    }

    function enableMicroblogPortrait(image) {
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = () => {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = () => {
                var url = reader.result;
                image.src = url;
            };
            reader.readAsDataURL(file);
        };
        image.onclick = () => fileInput.click();
    }

    function makeEditable(element, onEnter) {
        onEnter = onEnter || function() {};
        element.contentEditable = true;

        update();
        element.oninput = event => update();

        element.onkeydown = event => {
            if (event.keyCode === 13) {
                event.preventDefault();
                onEnter();
            }
        };

        function update() {
            element.classList.toggle('blank', element.textContent === '');
        }
    }

    function clearElement(element) {
        var elementBefore = document.activeElement;

        // Focus and `execCommand` to allow undo.
        element.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);

        if (elementBefore) elementBefore.focus();
    }

    function setElement(element, text) {
        var elementBefore = document.activeElement;
        element.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
        if (elementBefore) elementBefore.focus();
    }

    var broadcast = null;
    var sessionId = location.search.substring(1).toUpperCase();
    connectToBroadcast('wss://tabletopsoftware.herokuapp.com/' + sessionId, event => {
        if (event.data === 'ping') return;
        if (event.data === 'join') return;
        var payload = JSON.parse(event.data);
    })
    .then(newBroadcast => {
        broadcast = newBroadcast;
        broadcast('join');
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
