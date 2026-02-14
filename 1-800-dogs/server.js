const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

const PORT = process.env.PORT || 3000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function say(twiml, text) {
  twiml.say({ voice: 'Polly.Joanna', rate: '95%' }, text);
}

function pause(twiml, length = 1) {
  twiml.pause({ length });
}

// Generate a fake 4-digit "dog ID" status
function dogStatus(digits) {
  const statuses = [
    `Dog ${digits} is currently receiving belly rubs. Satisfaction level: maximum.`,
    `Dog ${digits} is in the middle of an important nap. Estimated wake time: unknown.`,
    `Dog ${digits} has been chasing their tail for the last forty-five minutes. Morale is high.`,
    `Dog ${digits} just finished a gourmet meal of kibble and is now staring out the window philosophically.`,
    `Dog ${digits} is attending an advanced obedience seminar. Results so far: inconclusive.`,
    `Dog ${digits} has escaped the yard again. Our retrieval team has been dispatched. Again.`,
    `Dog ${digits} is currently being a very good boy. This status has not changed since intake.`,
    `Dog ${digits} dug a hole to the center of the earth. We are monitoring the situation.`,
  ];
  // Deterministic pick based on digits
  const index = parseInt(digits, 10) % statuses.length;
  return statuses[index];
}

// ─── Main Menu ──────────────────────────────────────────────────────────────

app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Thank you for calling 1 800 DOGS, your premier full-service dog agency.');
  pause(twiml);
  say(twiml, 'Please listen carefully as our menu options have recently changed due to an incident involving a golden retriever and the old phone system.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/menu',
    method: 'POST',
    timeout: 10,
  });

  say(gather,
    'Press 1 for hours and location. ' +
    'Press 2 to check your dog\'s current status. ' +
    'Press 3 for dog adoption services. ' +
    'Press 4 for our dog training academy. ' +
    'Press 5 to report a lost dog. ' +
    'Press 6 for dog birthday party planning. ' +
    'Press 7 for our bark-to-english translation service. ' +
    'Press 8 for billing and payments. ' +
    'Press 9 to speak with a dog agent. ' +
    'Press 0 to hear these options again.'
  );

  // If no input, loop back
  twiml.redirect('/voice');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── Menu Router ────────────────────────────────────────────────────────────

app.post('/menu', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  switch (digit) {
    case '1': twiml.redirect('/hours');    break;
    case '2': twiml.redirect('/dog-status'); break;
    case '3': twiml.redirect('/adoption');   break;
    case '4': twiml.redirect('/training');   break;
    case '5': twiml.redirect('/lost-dog');   break;
    case '6': twiml.redirect('/birthday');   break;
    case '7': twiml.redirect('/translation'); break;
    case '8': twiml.redirect('/billing');    break;
    case '9': twiml.redirect('/hold');       break;
    case '0': twiml.redirect('/voice');      break;
    default:
      say(twiml, 'Sorry, that is not a valid option. Unlike dogs, our system does not understand everything.');
      twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 1: Hours & Location ───────────────────────────────────────────────────

app.post('/hours', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Thank you for your interest in visiting 1 800 DOGS. ' +
    'Our hours are Monday through Friday, 9 A M to 5 P M. ' +
    'On Saturdays we are open from 10 A M to 2 P M, which we call "Puppy Hours." ' +
    'On Sundays, we operate on dog time, which means we open whenever we feel like it. ' +
    'Usually around noon. After a nap.'
  );
  pause(twiml);
  say(twiml,
    'We are located at 123 Bark Avenue, Suite Woof, Woofington, D C, 2 0 5 0 1. ' +
    'We are directly across the street from the fire hydrant museum. You can\'t miss it. ' +
    'Our building is the one with all the dogs out front. ' +
    'Parking is available but please note that the lot is shared with a squirrel sanctuary, ' +
    'so keep your windows rolled up.'
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
    'Press 2 for directions from the nearest dog park. ' +
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
      'Holiday hours. ' +
      'We are closed on New Year\'s Day because the dogs are hungover from the fireworks. ' +
      'We are open on Valentine\'s Day with extended cuddle hours. ' +
      'We are closed on the Fourth of July because, and I cannot stress this enough, the fireworks. ' +
      'National Dog Day, August 26th, we are open 24 hours. Attendance is mandatory for all dogs. ' +
      'On Halloween, we close early because the costumes confuse them. ' +
      'Christmas Day we are closed, but the dogs are here. They live here.'
    );
    pause(twiml);
    twiml.redirect('/hours');
  } else if (digit === '2') {
    say(twiml,
      'From the nearest dog park, head north on Fetch Boulevard. ' +
      'Turn left at the big tree. You know the one. Every dog knows the one. ' +
      'Continue for approximately three tail wags, then turn right onto Bark Avenue. ' +
      'We are the building where all the barking is coming from. ' +
      'If you reach the cat cafe, you have gone too far and are in enemy territory.'
    );
    pause(twiml);
    twiml.redirect('/hours');
  } else if (digit === '9') {
    twiml.redirect('/voice');
  } else {
    say(twiml, 'Invalid option.');
    twiml.redirect('/hours');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 2: Dog Status ─────────────────────────────────────────────────────────

app.post('/dog-status', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'Welcome to the dog status checker. Powered by advanced sniff technology.');
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 4,
    action: '/dog-status-result',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Please enter your four digit dog I D number. ' +
    'This can be found on your dog\'s collar, on your intake paperwork, ' +
    'or tattooed on your heart if you love them enough.'
  );

  twiml.redirect('/dog-status');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/dog-status-result', (req, res) => {
  const twiml = new VoiceResponse();
  const digits = req.body.Digits;

  say(twiml, 'Looking up your dog now. Please hold while we consult the database.');
  pause(twiml, 2);
  say(twiml, 'Sniffing. Sniffing. Still sniffing.');
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
    'Press 2 to request a belly rub for your dog. This costs extra. ' +
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
      'Your request for a belly rub has been submitted. ' +
      'Please allow 3 to 5 business days for processing. ' +
      'Your dog will receive the belly rub in the order it was received. ' +
      'Premium belly rubs with the two-hand upgrade are available for an additional fee. ' +
      'Thank you for your patronage.'
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

  say(twiml,
    'Welcome to 1 800 DOGS adoption services, where every dog finds a home, ' +
    'and every home finds a dog hair on every surface.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/adoption-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 to hear about available breeds. ' +
    'Press 2 for adoption requirements. ' +
    'Press 3 for our Dog Compatibility Quiz. ' +
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
      'Currently available breeds. ' +
      'We have a Labrador Retriever named Chairman Woofs, who retrieves things you did not throw. ' +
      'A German Shepherd named Agent Barkley, who is convinced he works for the F B I. ' +
      'A Chihuahua named El Diablo Pequeño, who weighs 4 pounds and has a 40 pound attitude. ' +
      'A Great Dane named Tiny, because irony is not lost on us. ' +
      'A Poodle named Monsieur Fluffington the Third, who will only eat organic. ' +
      'And a mystery mutt named Hodgepodge, who is either 5 different breeds or a new species entirely. ' +
      'The D N A test was inconclusive.'
    );
    pause(twiml);
    twiml.redirect('/adoption');
  } else if (digit === '2') {
    say(twiml,
      'Adoption requirements. ' +
      'You must have a home. The dog also needs to live somewhere. ' +
      'You must pass a background check. The dog already passed theirs. Barely. ' +
      'You must demonstrate the ability to say "who\'s a good boy" with genuine enthusiasm at least 50 times per day. ' +
      'You must have a yard, or access to a park, or at minimum a very long hallway for zoomies. ' +
      'You must agree to love the dog unconditionally, even when they eat your shoes. ' +
      'Especially when they eat your shoes.'
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

  say(twiml,
    'Welcome to the 1 800 DOGS compatibility quiz. ' +
    'Please answer the following questions honestly. The dogs can smell dishonesty.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/quiz-q1',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Question 1. How do you feel about fur on your furniture? ' +
    'Press 1 for "I embrace it as decoration." ' +
    'Press 2 for "I own 7 lint rollers." ' +
    'Press 3 for "What is furniture if not a dog bed with extra steps."'
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
    'Question 2. A dog brings you a slobbery tennis ball. Do you: ' +
    'Press 1 to throw it and accept your fate for the next 3 hours. ' +
    'Press 2 to pretend to throw it. You monster. ' +
    'Press 3 to eat the tennis ball to establish dominance.'
  );

  twiml.redirect('/compatibility-quiz');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/quiz-q2', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Thank you for completing the compatibility quiz. ' +
    'Your results are being analyzed by our team of dog psychologists. ' +
    'Preliminary results indicate that you are... compatible with a dog. ' +
    'This is not surprising. Everyone is compatible with a dog. ' +
    'Dogs are the most compatible creatures on the planet. ' +
    'That is the whole point of dogs.'
  );
  pause(twiml);
  say(twiml, 'Returning you to the adoption menu.');
  twiml.redirect('/adoption');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── 4: Training Academy ───────────────────────────────────────────────────

app.post('/training', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml,
    'Welcome to the 1 800 DOGS training academy, where we teach dogs new tricks. ' +
    'Despite what the saying claims.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/training-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for basic obedience. Sit, stay, and the ever elusive "come." ' +
    'Press 2 for advanced training. Includes taxes, parallel parking, and existential philosophy. ' +
    'Press 3 for behavioral correction. For when your dog thinks they are the boss. They are, but we can pretend. ' +
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
      'Basic obedience covers sit, stay, come, down, and "drop it." ' +
      '"Drop it" is our most popular course, because dogs will pick up literally anything. ' +
      'Classes meet every Tuesday and Thursday. ' +
      'Graduation ceremony includes a tiny cap and gown. ' +
      'The cap will be eaten. It always is.'
    );
    pause(twiml);
    twiml.redirect('/training');
  } else if (digit === '2') {
    say(twiml,
      'Our advanced program includes off-leash training, agility courses, and emotional intelligence. ' +
      'Your dog will learn to read a room. Not literally. Dogs cannot read. ' +
      'We tried. It was a whole thing. ' +
      'The agility course includes jumps, tunnels, and a tiny balance beam. ' +
      'We also offer a master class in looking guilty, but most dogs have already mastered this.'
    );
    pause(twiml);
    twiml.redirect('/training');
  } else if (digit === '3') {
    say(twiml,
      'Behavioral correction is available for barking, jumping, digging, counter-surfing, ' +
      'and what we call "selective hearing," which is when your dog hears a cheese wrapper from 3 rooms away ' +
      'but cannot hear you say "come" from 5 feet away. ' +
      'Our success rate is 60 percent. The other 40 percent just had dogs that were too powerful.'
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

  say(twiml,
    'We are sorry to hear your dog is missing. ' +
    'But know this: no dog is ever truly lost. They are simply on an unauthorized adventure.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/lost-dog-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 if your dog escaped through the front door. This is the classic. ' +
    'Press 2 if your dog dug under the fence. Ambitious. ' +
    'Press 3 if your dog figured out the door handle. We need to talk about that. ' +
    'Press 4 if your dog simply vanished and you suspect interdimensional travel. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/lost-dog');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/lost-dog-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1' || digit === '2' || digit === '3' || digit === '4') {
    say(twiml,
      'Your report has been filed. ' +
      'We are dispatching our best sniffers immediately. ' +
      'Our retrieval team consists of 3 bloodhounds, a border collie with a clipboard, ' +
      'and a basset hound who is mostly there for moral support. ' +
      'Average retrieval time is 2 to 4 hours, depending on how many squirrels are out today. ' +
      'In the meantime, please leave a shoe outside your front door. ' +
      'Preferably one you have worn recently. The stinkier the better. ' +
      'This is not a joke. This is science.'
    );
    pause(twiml);
    if (digit === '4') {
      say(twiml,
        'Regarding your interdimensional travel concern: ' +
        'we have had 3 confirmed cases this year. ' +
        'In all cases the dog returned within 48 hours smelling like another dimension. ' +
        'Which is kind of like wet grass but... different.'
      );
      pause(twiml);
    }
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

  say(twiml,
    'Happy almost birthday to your dog! Or belated. We don\'t judge. ' +
    'Welcome to 1 800 DOGS party planning department.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/birthday-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 for our Basic Barkday package. Includes a hat, a cake made of peanut butter, and 3 squeaky toys. ' +
    'Press 2 for the Deluxe Pawty package. Includes everything in Basic plus a D J, a photo booth, and a pup-arazzi photographer. ' +
    'Press 3 for the Ultimate Good Boy Gala. This is the one where we rent the yacht. ' +
    'Press 9 to return to the main menu.'
  );

  twiml.redirect('/birthday');
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/birthday-sub', (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  if (digit === '1') {
    say(twiml,
      'Great choice! The Basic Barkday package is $49.99. ' +
      'The cake is shaped like a bone. Your dog will eat it in 4 seconds. ' +
      'The hat will last approximately 11 seconds before it is destroyed. ' +
      'The squeaky toys will haunt your dreams. ' +
      'To book, please speak with a dog agent. Transferring you now.'
    );
    pause(twiml);
    twiml.redirect('/hold');
  } else if (digit === '2') {
    say(twiml,
      'Excellent taste! The Deluxe Pawty package is $149.99. ' +
      'Our D J only plays songs with "bark," "woof," or "who let the dogs out." ' +
      'The photo booth comes with props including sunglasses, bow ties, and a tiny top hat. ' +
      'The pup-arazzi will capture every moment, including the inevitable cake incident.'
    );
    pause(twiml);
    twiml.redirect('/hold');
  } else if (digit === '3') {
    say(twiml,
      'Ah, the Ultimate Good Boy Gala. A person of culture. ' +
      'This package starts at $2,000 and includes a rented yacht, a 5-course meal prepared by a doggy chef, ' +
      'live entertainment by a howling quartet, ' +
      'and a red carpet entrance for every dog guest. ' +
      'We also provide tiny tuxedos and evening gowns. ' +
      'Last month\'s gala was crashed by a seagull. It was chaos. Beautiful chaos.'
    );
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

  say(twiml,
    'Welcome to the 1 800 DOGS bark to english translation service. ' +
    'Powered by our proprietary Barkchain A I technology.'
  );
  pause(twiml);

  const gather = twiml.gather({
    numDigits: 1,
    action: '/translation-sub',
    method: 'POST',
    timeout: 10,
  });
  say(gather,
    'Press 1 to translate a single bark. ' +
    'Press 2 to translate a series of barks. ' +
    'Press 3 for a bark-to-bark phrase book for communicating with your dog. ' +
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
      'A single bark can mean many things depending on pitch, duration, and context. ' +
      'A short, sharp bark means "alert! something exists!" ' +
      'A long, low bark means "I am large and in charge." ' +
      'A high-pitched bark means "I am excited about everything and nothing simultaneously." ' +
      'A bark followed by a spin means "the mail carrier is a threat to national security."'
    );
    pause(twiml);
    twiml.redirect('/translation');
  } else if (digit === '2') {
    say(twiml,
      'Multiple barks are more complex. Our analysis: ' +
      'Two barks: "Hey! Hey!" ' +
      'Three barks: "I am telling you something important and you are not listening." ' +
      'Continuous barking: "I have committed to this course of action and nothing will stop me." ' +
      'Barking at nothing: "I can see things you cannot. Do not ask questions."'
    );
    pause(twiml);
    twiml.redirect('/translation');
  } else if (digit === '3') {
    say(twiml,
      'Here are some useful phrases for communicating with your dog. ' +
      'To say "I love you" in dog, stare at your dog and blink slowly, then look away. ' +
      'To say "good job," use a high-pitched voice and say literally anything. The words don\'t matter. ' +
      'To say "please stop eating that," you can try, but we both know it\'s too late. ' +
      'To say "let\'s go for a walk," simply touch the leash. Or spell W A L K. ' +
      'Actually, most dogs have cracked that code. Maybe use a foreign language.'
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

  say(twiml,
    'You have reached the 1 800 DOGS billing department. ' +
    'All charges are calculated in bones. One bone equals approximately one dollar. ' +
    'We do not accept actual bones. We tried that. The dogs ate the currency.'
  );
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
    'Press 3 to dispute a charge. Note: most disputed charges turn out to be legitimate treat expenses. ' +
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
      'Checking your balance. ' +
      'Your current balance is 847 bones and 32 kibble. ' +
      'Your last charge was 12 bones for "emergency squeaky toy replacement." ' +
      'Your account is in good standing. Your dog\'s account is in better standing. ' +
      'They have accumulated 2,000 loyalty points, redeemable for belly rubs.'
    );
    pause(twiml);
    twiml.redirect('/billing');
  } else if (digit === '2') {
    say(twiml,
      'To make a payment, please have your credit card ready. ' +
      'Just kidding, this is a phone tree for a fake dog agency. ' +
      'But we appreciate the thought. ' +
      'If you would like to make a real payment, please speak with a dog agent.'
    );
    pause(twiml);
    twiml.redirect('/hold');
  } else if (digit === '3') {
    say(twiml,
      'We understand you\'d like to dispute a charge. ' +
      'Before we proceed, please understand that 94 percent of disputed charges ' +
      'are the result of the customer\'s dog ordering treats online. ' +
      'They have paws. They know how to use tablets now. ' +
      'We cannot be held responsible for your dog\'s online shopping habits. ' +
      'If you still wish to dispute, please speak with a dog agent.'
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
    'Please hold while we connect you to the next available dog agent. ' +
    'Your call is very important to us.'
  );
  pause(twiml);

  // Loop 1
  say(twiml,
    'We are currently experiencing higher than normal dog volume. ' +
    'All of our dog agents are assisting other callers. ' +
    'Your estimated wait time is: a lot.'
  );
  pause(twiml);
  say(twiml, 'Please enjoy this music while you wait.');
  pause(twiml);

  // "Hold music" - just saying musical dog content via TTS
  twiml.play('https://upload.wikimedia.org/wikipedia/commons/4/forty/Barking.ogg');
  pause(twiml, 1);

  say(twiml,
    'Who let the dogs out? That is not a rhetorical question. We genuinely need to know. ' +
    'There are dogs everywhere.'
  );
  pause(twiml, 3);

  // Loop 2
  say(twiml,
    'Your call is still important to us. ' +
    'You are currently number 47 in the queue. ' +
    'Just kidding. You are number 2. ' +
    'Actually, we\'re not sure. The system is run by dogs.'
  );
  pause(twiml, 2);

  say(twiml,
    'Did you know? The average dog knows about 165 words. ' +
    'That\'s more than some of our agents. ' +
    'We apologize. That was unprofessional. Our agents know at least 200 words.'
  );
  pause(twiml, 3);

  // Loop 3
  say(twiml,
    'We appreciate your patience. ' +
    'While you wait, here is a fun fact: ' +
    'a dog\'s nose print is unique, like a human fingerprint. ' +
    'We use nose prints for employee I D badges.'
  );
  pause(twiml, 2);

  say(twiml,
    'Your call is extremely important to us. ' +
    'We are experiencing higher than normal dog volume due to a sudden influx of good boys. ' +
    'And girls. They are all good.'
  );
  pause(twiml, 2);

  // Loop 4
  say(twiml,
    'Thank you for continuing to hold. ' +
    'Your loyalty is noted and will be rewarded with 5 bonus loyalty bones. ' +
    'These bones are not redeemable for anything.'
  );
  pause(twiml, 2);

  say(twiml,
    'Another fun fact while you wait: ' +
    'Dogs can smell up to 100,000 times better than humans. ' +
    'This is why we had to ban cologne in the office. The dogs kept fainting.'
  );
  pause(twiml, 3);

  // Finally "connect"
  say(twiml,
    'Great news! A dog agent is now available. Connecting you now. ' +
    'Please note that all calls are monitored for quality and training purposes. ' +
    'Also, the agent may pant. This is normal.'
  );
  pause(twiml, 2);

  twiml.redirect('/agent');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── The "Agent" ────────────────────────────────────────────────────────────

app.post('/agent', (req, res) => {
  const twiml = new VoiceResponse();

  say(twiml, 'You are now connected to Agent Barksworth.');
  pause(twiml, 1);

  // Play barking sounds multiple times to simulate a "conversation"
  // Using freely available barking audio from Wikimedia Commons
  const barkUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/forty/Barking.ogg';

  twiml.play(barkUrl);
  pause(twiml, 1);
  twiml.play(barkUrl);
  pause(twiml, 2);

  say(twiml,
    'Agent Barksworth seems very enthusiastic about your inquiry.'
  );
  pause(twiml, 1);

  twiml.play(barkUrl);
  pause(twiml, 1);
  twiml.play(barkUrl);
  twiml.play(barkUrl);
  pause(twiml, 1);

  say(twiml,
    'Agent Barksworth is consulting with a supervisor.'
  );
  pause(twiml, 2);

  twiml.play(barkUrl);
  pause(twiml, 1);

  say(twiml,
    'Agent Barksworth has resolved your issue. ' +
    'If you are satisfied with this interaction, please leave a treat by the phone. ' +
    'Thank you for calling 1 800 DOGS. Remember: every dog has its day, and today was yours. ' +
    'Goodbye!'
  );
  pause(twiml, 1);

  // One final bark
  twiml.play(barkUrl);

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
        <h2>Your Premier Full-Service Dog Agency</h2>
        <p>This is the Twilio IVR backend for 1-800-DOGS.</p>
        <p>Configure your Twilio phone number's webhook to point to <code>/voice</code> (POST).</p>
        <h3>Phone Tree:</h3>
        <ol>
          <li>Hours &amp; Location</li>
          <li>Check Dog Status</li>
          <li>Adoption Services</li>
          <li>Training Academy</li>
          <li>Report a Lost Dog</li>
          <li>Birthday Party Planning</li>
          <li>Bark Translation Service</li>
          <li>Billing &amp; Payments</li>
          <li>Speak to a Dog Agent</li>
          <li>Repeat Menu</li>
        </ol>
      </body>
    </html>
  `);
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`1-800-DOGS IVR server running on port ${PORT}`);
  console.log(`Configure your Twilio webhook to POST to http://your-server:${PORT}/voice`);
});
