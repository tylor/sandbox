const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

const PORT = process.env.PORT || 3000;

// The base URL for self-hosted audio files — set via env or fall back to request host
function audioUrl(req, file) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/audio/${file}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function say(twiml, text) {
  twiml.say({ voice: 'Polly.Joanna', rate: '95%' }, text);
}

function pause(twiml, length = 1) {
  twiml.pause({ length });
}

function dogStatus(digits) {
  const statuses = [
    `Dog ${digits} is napping. Estimated wake time: unknown.`,
    `Dog ${digits} is receiving belly rubs. Do not disturb.`,
    `Dog ${digits} has been chasing its tail for 45 minutes. No signs of stopping.`,
    `Dog ${digits} is staring out the window. We believe this is philosophical.`,
    `Dog ${digits} is in obedience training. Results so far: inconclusive.`,
    `Dog ${digits} has escaped the yard. Our retrieval team has been dispatched.`,
    `Dog ${digits} is being a good boy. This status has not changed since intake.`,
    `Dog ${digits} dug a large hole this morning. We are monitoring the situation.`,
  ];
  return statuses[parseInt(digits, 10) % statuses.length];
}

// ─── Main Menu ──────────────────────────────────────────────────────────────

app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Thank you for calling 1 800 DOGS.');
  pause(twiml);
  say(twiml, 'Please listen carefully, as our menu options have recently changed.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/menu',
    method: 'POST',
    timeout: 10,
  });

  say(gather,
    'Press 1 for hours and location. ' +
    'Press 2 to check your dog\'s status. ' +
    'Press 3 for adoption services. ' +
    'Press 4 for training. ' +
    'Press 5 to report a lost dog. ' +
    'Press 6 for birthday party planning. ' +
    'Press 7 for bark translation. ' +
    'Press 8 for billing. ' +
    'Press 9 to speak with an agent. ' +
    'Press 0 to hear these options again.'
  );

  twiml.redirect('/voice');
  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── Menu Router ────────────────────────────────────────────────────────────

app.post('/menu', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  switch (digit) {
    case '1': twiml.redirect('/hours');       break;
    case '2': twiml.redirect('/dog-status');  break;
    case '3': twiml.redirect('/adoption');    break;
    case '4': twiml.redirect('/training');    break;
    case '5': twiml.redirect('/lost-dog');    break;
    case '6': twiml.redirect('/birthday');    break;
    case '7': twiml.redirect('/translation'); break;
    case '8': twiml.redirect('/billing');     break;
    case '9': twiml.redirect('/hold');        break;
    case '0': twiml.redirect('/voice');       break;
    default:
      say(twiml, 'That is not a valid option.');
      twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 1: Hours & Location ───────────────────────────────────────────────────

app.post('/hours', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Our hours are Monday through Friday, 9 A M to 5 P M. ' +
    'Saturday 10 to 2. Sunday we are closed.'
  );
  pause(twiml);
  say(twiml,
    'We are located at 123 Bark Avenue, Woofington, D C. ' +
    'Across from the fire hydrant museum.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/hours-sub',
    method: 'POST',
    timeout: 5,
  });
  say(gather,
    'Press 1 for holiday hours. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/hours');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/hours-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'We are closed New Year\'s Day, Fourth of July, and Christmas. ' +
      'We are open 24 hours on National Dog Day, August 26th. ' +
      'We close early on Halloween.'
    );
    pause(twiml);
    twiml.redirect('/hours');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 2: Dog Status ─────────────────────────────────────────────────────────

app.post('/dog-status', (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 4,
    action: '/dog-status-result',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Please enter your four digit dog I D number.'
  );

  twiml.redirect('/dog-status');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/dog-status-result', (req, res) => {
  const twiml = new VoiceResponse();
  const digits = req.body.Digits;

  say(twiml, 'One moment.');
  pause(twiml, 2);
  say(twiml, dogStatus(digits));
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/dog-status-after',
    method: 'POST',
    timeout: 5,
  });
  say(gather,
    'Press 1 to check another dog. ' +
    'Press 2 to request a belly rub for your dog. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/dog-status');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/dog-status-after', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    twiml.redirect('/dog-status');
  } else if (digit === '2') {
    say(twiml,
      'Your belly rub request has been submitted. Please allow 3 to 5 business days.'
    );
    pause(twiml);
    twiml.redirect('/voice');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 3: Adoption Services ──────────────────────────────────────────────────

app.post('/adoption', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Adoption services.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/adoption-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for available dogs. ' +
    'Press 2 for adoption requirements. ' +
    'Press 3 for our compatibility quiz. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/adoption');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/adoption-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'Currently available: ' +
      'A Labrador named Chairman Woofs. ' +
      'A German Shepherd named Agent Barkley. ' +
      'A Chihuahua named El Diablo. Four pounds. ' +
      'A Great Dane named Tiny. ' +
      'And a mystery mutt named Hodgepodge. The D N A test was inconclusive.'
    );
    pause(twiml);
    twiml.redirect('/adoption');
  } else if (digit === '2') {
    say(twiml,
      'You will need a home, a yard or access to a park, and the ability to pass a background check. ' +
      'The dog already passed theirs.'
    );
    pause(twiml);
    twiml.redirect('/adoption');
  } else if (digit === '3') {
    twiml.redirect('/compatibility-quiz');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── Compatibility Quiz ─────────────────────────────────────────────────────

app.post('/compatibility-quiz', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Compatibility quiz. Please answer honestly.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/quiz-q1',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'How do you feel about fur on your furniture? ' +
    'Press 1 for "It\'s fine." ' +
    'Press 2 for "I own several lint rollers." ' +
    'Press 3 for "Furniture is just a dog bed."'
  );

  twiml.redirect('/compatibility-quiz');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/quiz-q1', (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    numDigits: 1,
    action: '/quiz-q2',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'A dog brings you a tennis ball. Do you: ' +
    'Press 1 to throw it. ' +
    'Press 2 to fake throw it. ' +
    'Press 3 to keep it. Establish dominance.'
  );

  twiml.redirect('/compatibility-quiz');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/quiz-q2', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Your results are in. You are compatible with a dog. ' +
    'Everyone is compatible with a dog. That is the whole point of dogs.'
  );
  pause(twiml);
  twiml.redirect('/adoption');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 4: Training Academy ───────────────────────────────────────────────────

app.post('/training', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Training services.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/training-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for basic obedience. ' +
    'Press 2 for advanced training. ' +
    'Press 3 for behavioral correction. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/training');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/training-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'Basic obedience covers sit, stay, come, and drop it. ' +
      'Classes meet Tuesdays and Thursdays. Graduation includes a tiny cap and gown.'
    );
    pause(twiml);
    twiml.redirect('/training');
  } else if (digit === '2') {
    say(twiml,
      'Advanced training includes off-leash work, agility, and impulse control. ' +
      'We also offer a class in looking guilty, but most dogs already know that one.'
    );
    pause(twiml);
    twiml.redirect('/training');
  } else if (digit === '3') {
    say(twiml,
      'Behavioral correction is available for barking, jumping, digging, and selective hearing. ' +
      'Our success rate is about 60 percent.'
    );
    pause(twiml);
    twiml.redirect('/training');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 5: Lost Dog ───────────────────────────────────────────────────────────

app.post('/lost-dog', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Lost dog department.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/lost-dog-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 if your dog escaped through the front door. ' +
    'Press 2 if your dog dug under the fence. ' +
    'Press 3 if your dog opened the door themselves. ' +
    'Press 4 for other or unknown circumstances. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/lost-dog');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/lost-dog-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit >= '1' && digit <= '4') {
    say(twiml,
      'Your report has been filed. Our retrieval team has been dispatched. ' +
      'Please leave a recently worn shoe outside your front door. This helps.'
    );
    pause(twiml);
    twiml.redirect('/voice');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 6: Birthday Party Planning ────────────────────────────────────────────

app.post('/birthday', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Birthday party planning.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/birthday-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for the Basic package. Hat, peanut butter cake, squeaky toys. $49.99. ' +
    'Press 2 for Deluxe. Adds a D J and photo booth. $149.99. ' +
    'Press 3 for the Gala. This one includes a yacht. Starts at $2,000. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/birthday');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/birthday-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit >= '1' && digit <= '3') {
    say(twiml, 'To book, we\'ll connect you with an agent.');
    pause(twiml);
    twiml.redirect('/hold');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 7: Bark Translation ───────────────────────────────────────────────────

app.post('/translation', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Bark to english translation service.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/translation-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for single bark meanings. ' +
    'Press 2 for multiple bark analysis. ' +
    'Press 3 for a phrase book. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/translation');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/translation-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'One short bark means alert. ' +
      'One long bark means warning. ' +
      'One high bark means excitement. ' +
      'A bark followed by a spin means the mail carrier has arrived.'
    );
    pause(twiml);
    twiml.redirect('/translation');
  } else if (digit === '2') {
    say(twiml,
      'Two barks means hey. ' +
      'Three barks means listen to me. ' +
      'Continuous barking means I have committed to this. ' +
      'Barking at nothing means I can see something you cannot.'
    );
    pause(twiml);
    twiml.redirect('/translation');
  } else if (digit === '3') {
    say(twiml,
      'To say I love you, blink slowly. ' +
      'To say good job, just use a high voice. The words do not matter. ' +
      'To say let\'s go for a walk, touch the leash. Or spell it. ' +
      'They have probably cracked that code too.'
    );
    pause(twiml);
    twiml.redirect('/translation');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 8: Billing ─────────────────────────────────────────────────────────────

app.post('/billing', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Billing department.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/billing-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 to check your balance. ' +
    'Press 2 to make a payment. ' +
    'Press 3 to dispute a charge. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/billing');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/billing-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'Your current balance is $847.32. ' +
      'Your last charge was $12 for emergency squeaky toy replacement. ' +
      'Your account is in good standing.'
    );
    pause(twiml);
    twiml.redirect('/billing');
  } else if (digit === '2') {
    say(twiml, 'To make a payment, we\'ll connect you with an agent.');
    pause(twiml);
    twiml.redirect('/hold');
  } else if (digit === '3') {
    say(twiml,
      'Please note that most disputed charges turn out to be treat purchases made by the dog. ' +
      'We\'ll connect you with an agent.'
    );
    pause(twiml);
    twiml.redirect('/hold');
  } else {
    twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 9: Hold / Speak to Agent ──────────────────────────────────────────────

app.post('/hold', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Please hold while we connect you to the next available agent. ' +
    'Your call is important to us.'
  );
  pause(twiml, 2);

  // Hold music
  twiml.play(audioUrl(req, 'hold-music.wav'));

  say(twiml,
    'We are currently experiencing higher than normal dog volume. ' +
    'All agents are assisting other callers. Please continue to hold.'
  );
  pause(twiml, 2);

  // More hold music
  twiml.play(audioUrl(req, 'hold-music.wav'));

  say(twiml,
    'Your call is still important to us. ' +
    'You are currently caller number 47 in the queue.'
  );
  pause(twiml, 3);

  say(twiml,
    'We apologize for the wait. We are experiencing higher than normal dog volume. ' +
    'An agent will be with you shortly.'
  );
  pause(twiml, 2);

  // More hold music
  twiml.play(audioUrl(req, 'hold-music.wav'));

  say(twiml,
    'Thank you for your patience. ' +
    'Did you know the average dog knows 165 words? That is more than some of our agents.'
  );
  pause(twiml, 3);

  say(twiml,
    'We continue to experience higher than normal dog volume. ' +
    'Your estimated wait time is... a lot. Thank you for holding.'
  );
  pause(twiml, 2);

  say(twiml, 'An agent is now available. Connecting you.');
  pause(twiml, 2);

  twiml.redirect('/agent');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── The "Agent" ────────────────────────────────────────────────────────────

app.post('/agent', (req, res) => {
  const twiml = new VoiceResponse();
  const bark1 = audioUrl(req, 'bark1.wav');
  const bark2 = audioUrl(req, 'bark2.wav');
  const bark3 = audioUrl(req, 'bark3.wav');

  say(twiml, 'You are now connected with Agent Barksworth.');
  pause(twiml, 1);

  twiml.play(bark2);
  pause(twiml, 1);
  twiml.play(bark1);
  pause(twiml, 2);

  say(twiml, 'Agent Barksworth is reviewing your account.');
  pause(twiml, 1);

  twiml.play(bark3);
  pause(twiml, 1);

  say(twiml, 'One moment. Agent Barksworth is consulting with a supervisor.');
  pause(twiml, 2);

  twiml.play(bark2);
  pause(twiml, 1);
  twiml.play(bark1);
  pause(twiml, 1);
  twiml.play(bark3);
  pause(twiml, 2);

  say(twiml,
    'Agent Barksworth has resolved your issue. ' +
    'Thank you for calling 1 800 DOGS. Goodbye.'
  );
  pause(twiml, 1);

  twiml.play(bark1);

  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── Health check / root ────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>1-800-DOGS</title></head>
      <body style="font-family: monospace; max-width: 600px; margin: 40px auto; padding: 20px;">
        <h1>1-800-DOGS</h1>
        <p>Twilio IVR backend. Configure your webhook to POST to <code>/voice</code>.</p>
        <h3>Menu:</h3>
        <ol>
          <li>Hours &amp; Location</li>
          <li>Dog Status</li>
          <li>Adoption</li>
          <li>Training</li>
          <li>Lost Dog</li>
          <li>Birthday Parties</li>
          <li>Bark Translation</li>
          <li>Billing</li>
          <li>Speak to Agent</li>
          <li>Repeat</li>
        </ol>
      </body>
    </html>
  `);
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`1-800-DOGS IVR running on port ${PORT}`);
});
