/**
 * der Knall-Bumm-Bot
 * er errechnet aus Menge, Alkoholgehalt und Preis den Kanll-Bumm-Wert ;)
 */

// imports

// bot-Token
const token = process.argv[2];
if(!token) throw new Error("pls setup bot token in your nodejs call");

// bot
process.env.NTBA_FIX_319 = 1; // aus dem internet kopiert ...
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(token, { polling: true });

const ref_alc = 40 * 20; // 40% * 20 ml

// start / help
bot.onText(/^(\/start|\/help){1}$/, (msg, match) => {
	bot.sendMessage(msg.chat.id, `Hey, sende mir folgende Parameter in einer Zeile, getrennt mit Leerzeichen und du erhältst den Knall-Bumm-Wert (Shots pro Euro aka. 8ml acl/Euro).\n\n - Flüssigskeitsvolumen in Liter (Ab '10' wird es als ml gerechnet)\n - Alkoholgehalt in Prozent\n - Preis in Euro\n - optional: Name des Wertes\n\nBewust genießen!\n\n\n500 5 1 Bier für'n €\n40 40 1 doppelter Whysik für'n €`);
});

// fehler im bot
bot.on('polling_error', console.error);
bot.on('webhook_error', console.error);



// generate the text-block and the result for a input line.
function gen_text_and_result_from_a_input_line(input_line, alt_name) {
	const returning_object = {
		text: '🥂 ',
		result: undefined, // 🤷🏻‍♂️
		name: alt_name,
	};

	const input_values = input_line.split(' ');

	// there shoulde be 3 or more ...
	if(input_values.length < 3) {
		returning_object.text = 'Es müssen 3 oder mehr Werte/Texte, getrennt durch Leerzeichen sein. Siehe /help';
		return returning_object;
	}


	// in den drei elementen soll eine zahl drin stehen
	for(let i = 0; i < 3; i++) {
		input_values[i] = input_values[i].replace(",", ".");
		input_values[i] = parseFloat(input_values[i]);
		if(typeof input_values[i] !== 'number' || isNaN(input_values[i])) {
			// der Wert ist keine Nummer
			returning_object.text = 'Der ' + i + '. Werte konnt nicht als Zahl erkannt werden! /help';
			return returning_object;
		}
		if(input_values[i] < 0) {
			// ein Wert ist kleiner 0
			returning_object.text = 'Der ' + i + '. Werteist kleiner 0 ... das wird nichts ... /help';
			return returning_object;
		}
	}


	if(input_values[1] > 100) {
		returning_object.text = 'Der Alkoholgehalt übersteigt die 100%. wie geht das??? /help';
		return returning_object;
	}
	if(input_values[0] == 0) {
		returning_object.text = 'Das würde ich nicht trinken ...';
		return returning_object;
	}
	if(input_values[1] == 0) {
		returning_object.text = 'naja ... ohne ist halt ohne ...';
		return returning_object;
	}
	if(input_values[0] >= 10) input_values[0] /= 1000; // die Umrechnung auf ml



	// die Werte scheinen OK zu sein ...
	const vol = input_values[0];
	const alc = input_values[1];
	const eur = input_values[2];

	const alc_in = vol * alc / 100 * 1000;
	const shots = alc_in / ref_alc * 100;

	let shots_per_eur = round(((vol * alc / 100) / eur * (1000 / ref_alc))); // shots pro Euro
	let alc_per_eur = round(((vol * alc / 100) / eur * (1000))); // alc pro Euro

	// save for compare
	returning_object.result = alc_per_eur;

	alc_per_eur = isFinite(alc_per_eur) ? alc_per_eur : "UNENDLICH";
	shots_per_eur = isFinite(shots_per_eur) ? shots_per_eur : "UNENDLICH";


	// built text-block
	// is there a name?
	if(input_values.length > 3) {
		returning_object.text += `<b>${input_values.slice(3, input_values.length).join(" ")}</b>:\n\n`;
		returning_object.name = input_values.slice(3, input_values.length).join(" ");
	}

	returning_object.text += `Eingabe:
<code>${vol} Liter (${vol * 1000}ml)
mit ${alc}% Alkohol
für ${eur}€</code>

Berechnungen:
<code>
emthaltene Menge Alc:      ${alc_in} ml
Menge für Shots (je 20ml): ${round(vol * 1000 / 20)}
Alkohol für Shots:         ${round(shots)}

Menge für 1 Shot Alc:      ${round(vol / shots * 1000)} ml
Kosten für 1 Liter:        ${round(eur / vol)} €
Kosten für 1 ml Alc:       ${alc_in > 0 ? round(eur / alc_in) : "UNENDLICH"} €</code>

➡️ <b>Alc. pro Euro: ${alc_per_eur} ml</b>`;


	// all fine xD
	return returning_object;
}

bot.on("text", (msg) => {
	// abbruch, wenn es ein "Befehl" ist
	if(msg.text[0] == "/") return;

	const lines = msg.text.split('\n');


	const data = lines.map((line, index) => gen_text_and_result_from_a_input_line(line, 'Nr ' + (index + 1)));

	let text = data.map(obj => obj.text).join('\n\n\n');

	if(lines.length > 1) {
		const winner = data.reduce((s, x) => x.result > s.result ? x : s, { result: 0 });
		const nr = data.findIndex(x => x.result == winner.result) + 1;
		text += `\n\n⭐️ Gewinner: <b>${winner.name}</b> mit <b>${winner.result} ml Alc. pro Euro</b>`;
	}

	bot.sendMessage(msg.chat.id, text, { "parse_mode": "HTML" });
});

function round(x) {
	return Math.round(x * 100) / 100;
}
