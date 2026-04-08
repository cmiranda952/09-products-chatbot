// Main function to initialize the chat interface
function initChat() {
    // Get all required DOM elements
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const openIcon = document.querySelector('.open-icon');
    const closeIcon = document.querySelector('.close-icon');
    let rentals = [];
    const matchingState = {
        currentQuestion: 1,
        answers: {
            vibe: '',
            area: '',
            priority: ''
        }
    };

    // Load rentals data once when the chat initializes
    async function loadRentalsData() {
        try {
            const response = await fetch('./rentals.json');
            if (!response.ok) {
                throw new Error(`Failed to load rentals.json (${response.status})`);
            }

            const data = await response.json();
            rentals = data.rentals || [];
        } catch (error) {
            console.error('Could not load rentals data:', error);
            rentals = [];
        }
    }

    // Add a bot message to the chat window
    function addBotMessage(text) {
        const botMessage = document.createElement('div');
        botMessage.classList.add('message', 'bot');
        botMessage.textContent = text;
        // Keep line breaks so multi-line recommendations are easy to read
        botMessage.style.whiteSpace = 'pre-line';
        chatMessages.appendChild(botMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Determine which broad region a rental belongs to based on location text
    function getRentalRegion(location) {
        const lowerLocation = location.toLowerCase();

        if (lowerLocation.includes('oregon') || lowerLocation.includes('california')) {
            return 'west coast';
        }
        if (lowerLocation.includes('nevada') || lowerLocation.includes('new mexico')) {
            return 'southwest';
        }
        if (lowerLocation.includes('colorado')) {
            return 'mountain';
        }
        if (lowerLocation.includes('massachusetts')) {
            return 'northeast';
        }
        if (lowerLocation.includes('texas')) {
            return 'texas';
        }

        return 'other';
    }

    // Add simple tags for each rental based on name + description keywords
    function getRentalTags(rental) {
        const text = `${rental.name} ${rental.description}`.toLowerCase();
        const tags = [];

        if (text.includes('ghost') || text.includes('haunted') || text.includes('eerie')) {
            tags.push('spooky');
        }
        if (text.includes('meme') || text.includes('funny') || text.includes('laugh')) {
            tags.push('funny');
        }
        if (text.includes('unicorn') || text.includes('rainbow') || text.includes('magical')) {
            tags.push('magical');
        }
        if (text.includes('ufo') || text.includes('alien') || text.includes('cosmic')) {
            tags.push('scifi');
        }
        if (text.includes('marshmallow') || text.includes('cozy') || text.includes('luxury')) {
            tags.push('cozy');
        }
        if (text.includes('upside-down') || text.includes('topsy-turvy') || text.includes('weird')) {
            tags.push('weird');
        }

        return tags;
    }

    // Convert free-text vibe answers into one of our simple vibe categories
    function parseVibeAnswer(answer) {
        const lower = answer.toLowerCase();

        if (lower.includes('spooky') || lower.includes('ghost') || lower.includes('haunted')) {
            return 'spooky';
        }
        if (lower.includes('funny') || lower.includes('meme') || lower.includes('laugh')) {
            return 'funny';
        }
        if (lower.includes('magical') || lower.includes('dream') || lower.includes('unicorn')) {
            return 'magical';
        }
        if (lower.includes('scifi') || lower.includes('sci-fi') || lower.includes('space') || lower.includes('ufo') || lower.includes('alien')) {
            return 'scifi';
        }
        if (lower.includes('cozy') || lower.includes('relax') || lower.includes('calm')) {
            return 'cozy';
        }
        if (lower.includes('weird') || lower.includes('quirky') || lower.includes('strange')) {
            return 'weird';
        }

        return '';
    }

    // Convert free-text area answers into one of our regions
    function parseAreaAnswer(answer) {
        const lower = answer.toLowerCase();

        if (lower.includes('west') || lower.includes('oregon') || lower.includes('california') || lower.includes('portland')) {
            return 'west coast';
        }
        if (lower.includes('southwest') || lower.includes('nevada') || lower.includes('new mexico') || lower.includes('santa fe')) {
            return 'southwest';
        }
        if (lower.includes('mountain') || lower.includes('colorado') || lower.includes('aspen') || lower.includes('boulder')) {
            return 'mountain';
        }
        if (lower.includes('northeast') || lower.includes('massachusetts') || lower.includes('salem')) {
            return 'northeast';
        }
        if (lower.includes('texas') || lower.includes('austin')) {
            return 'texas';
        }

        return '';
    }

    // Convert priority answer into ranking preference
    function parsePriorityAnswer(answer) {
        const lower = answer.toLowerCase();

        if (lower.includes('rating') || lower.includes('review') || lower.includes('best') || lower.includes('top')) {
            return 'rating';
        }
        if (lower.includes('unique') || lower.includes('weird') || lower.includes('creative') || lower.includes('fun')) {
            return 'unique';
        }

        return 'rating';
    }

    // Score each rental against the user's answers and return top matches
    function findTopMatches() {
        const selectedVibe = parseVibeAnswer(matchingState.answers.vibe);
        const selectedArea = parseAreaAnswer(matchingState.answers.area);
        const selectedPriority = parsePriorityAnswer(matchingState.answers.priority);

        const rankedRentals = rentals.map(function(rental) {
            let score = 0;
            const rentalTags = getRentalTags(rental);
            const rentalRegion = getRentalRegion(rental.location);

            if (selectedVibe && rentalTags.includes(selectedVibe)) {
                score += 4;
            }

            if (selectedArea && rentalRegion === selectedArea) {
                score += 3;
            }

            if (selectedPriority === 'rating') {
                score += rental.avgRating;
            } else {
                // For uniqueness, give extra weight to whimsical keywords
                score += 3;
                if (rentalTags.length > 0) {
                    score += rentalTags.length;
                }
                score += rental.avgRating * 0.4;
            }

            return {
                rental: rental,
                score: score,
                rentalTags: rentalTags,
                rentalRegion: rentalRegion
            };
        });

        rankedRentals.sort(function(a, b) {
            return b.score - a.score;
        });

        return rankedRentals.slice(0, 3);
    }

    // Build a beginner-friendly explanation for each match
    function buildMatchReason(match) {
        const reasons = [];
        const selectedVibe = parseVibeAnswer(matchingState.answers.vibe);
        const selectedArea = parseAreaAnswer(matchingState.answers.area);

        if (selectedVibe && match.rentalTags.includes(selectedVibe)) {
            reasons.push(`matches your ${selectedVibe} vibe`);
        }

        if (selectedArea && match.rentalRegion === selectedArea) {
            reasons.push(`is in your preferred ${selectedArea} area`);
        }

        reasons.push(`has a ${match.rental.avgRating} rating`);

        return reasons.join(', ');
    }

    // Ask the next question in our 3-question matching flow
    function askNextQuestion() {
        if (matchingState.currentQuestion === 1) {
            addBotMessage('Question 1 of 3: What vibe are you in the mood for?\n• spooky\n• funny\n• magical\n• sci-fi\n• cozy\n• weird');
            return;
        }

        if (matchingState.currentQuestion === 2) {
            addBotMessage('Question 2 of 3: Which area sounds best?\n• West Coast\n• Southwest\n• Mountain\n• Northeast\n• Texas');
            return;
        }

        if (matchingState.currentQuestion === 3) {
            addBotMessage('Question 3 of 3: What matters more to you?\n• highest rating\n• most unique experience');
        }
    }

    // Toggle chat visibility and swap icons
    chatToggle.addEventListener('click', function() {
        chatBox.classList.toggle('active');
        openIcon.style.display = chatBox.classList.contains('active') ? 'none' : 'block';
        closeIcon.style.display = chatBox.classList.contains('active') ? 'block' : 'none';
    });

    // Handle user input and process messages
    async function handleUserInput(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            userInput.value = '';

            // Display the user's message
            const userMessage = document.createElement('div');
            userMessage.classList.add('message', 'user');
            userMessage.textContent = message;
            chatMessages.appendChild(userMessage);

            // Wait for rentals data if the user sends a message very quickly after page load
            if (rentals.length === 0) {
                addBotMessage('I am still loading the rental list. Please try again in a moment.');
                return;
            }

            if (matchingState.currentQuestion === 1) {
                matchingState.answers.vibe = message;
                matchingState.currentQuestion = 2;
                askNextQuestion();
            } else if (matchingState.currentQuestion === 2) {
                matchingState.answers.area = message;
                matchingState.currentQuestion = 3;
                askNextQuestion();
            } else {
                matchingState.answers.priority = message;

                const topMatches = findTopMatches();
                const recommendationLines = topMatches.map(function(match, index) {
                    return `${index + 1}. ${match.rental.name}\n   Location: ${match.rental.location}\n   Why it matches: ${buildMatchReason(match)}`;
                });

                addBotMessage(`Great picks based on your answers! Here are your top matches:\n\n${recommendationLines.join('\n\n')}`);

                // Reset and start a new short matching conversation
                matchingState.currentQuestion = 1;
                matchingState.answers = {
                    vibe: '',
                    area: '',
                    priority: ''
                };

                addBotMessage('Want to try another match? I can ask 3 quick questions again.');
                askNextQuestion();
            }

            // Scroll to the latest message
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Listen for form submission
    document.getElementById('chatForm').addEventListener('submit', handleUserInput);

    // Start loading rentals data right away
    loadRentalsData();

    // Start the guided matching conversation
    addBotMessage('Let\'s find your perfect offbeat retreat. I\'ll ask 3 quick questions and then suggest your best matches.');
    askNextQuestion();
}

// Initialize the chat interface
initChat();
