/*
TODO:

- Clean up
- Function to tie notes that go over barlines
- Implement localstorage ?
*/

// USER INPUT TRANSFORMATION //
// ========================= //

// Takes a string (either 'notes' or 'rhythms').
// Updates hidden textareas of the chosen input and its corresponding canvas.
// Also updates the generated loop.
function updateFields(currentField) {
	var notes_str = $('#notes_input').val();
	var rhythms_str = $('#rhythms_input').val();
	var title = $('#title_input').val();// || "XP";
	var bpm = $('#bpm_input').val();// || "100";
	updateXP(notes_str, rhythms_str, title, bpm, "xp_input");

	if (currentField == "notes") {
		updateNotes(notes_str, 'notes_translated');
	} else if (currentField == "rhythms") {
		updateRhythms(rhythms_str, 'rhythms_translated');
	};
};

// Takes the user's raw input (notes, rhythms, title and bpm)
// and the id string of the output textarea (ex.: 'xp_out').
// Updates the generated loop string and its corresponding canvas.
function updateXP(notes_str, rhythms_str, title, bpm, out_id) {
	// Make array of notes out of input
	notes_str = clean_input_str(notes_str);
	var notes_a = notes_str.split(/[ ]+/);

	// Make array of rhythms out of input
	rhythms_str = clean_input_str(rhythm_str);
	var rhythms_a = rhythms_str.split(/[\D]+/);

	// Generate the loop
	var xp_abc = make_abc_xp(notes_a, rhythms_a);
	var ts = r_to_ts(rhythms_a);
	
	// Format the loop
	xp_abc = format_abc_str(xp_abc, ts, 4);
	xp_abc = add_intro_to_abc_str(title, bpm, xp_abc, ts);

	// Update loop textarea
	var xp_textarea = $('#' + out_id);
	xp_textarea.val(xp_abc);

	// Update loop canvas
	var xp_editor = update_editor(out_id, "xp_canvas", "xp_midi", "xp_midi_dl", 650);
};

// Takes the user's raw notes input and the hidden output textarea id string
// (ex.: 'notes_output') that will be read by abcjs to generate the canvas.
// Updates the hidden notes input textarea and its corresponding canvas.
function updateNotes(notes_str, out_id) {
	// Add line breaks every 4 notes
	notes_str = clean_input_str(notes_str);
	notes_str = line_break_every_n_notes(notes_str, 4);
	
	// Add intro info to the string
	// (makes notes appear as halves)
	notes_str = "L: 1/2\n" + notes_str;

	// Update hidden notes textarea
	$('#' + out_id).val(notes_str);

	// Update notes canvas
	var notes_editor = update_editor(out_id, "notes_canvas", "notes_midi", "notes_midi_dl", 350);
};

// Takes the user's raw rhythmic input and the hidden output textarea id string
// (ex.: 'rhythmss_output') that will be read by abcjs to generate the canvas.
// Updates the hidden rhythm input textarea and its corresponding canvas.
function updateRhythms(rhythms_str, out_id) {
	// Make array of rhythms out of input
	rhythms_str = clean_input_str(rhythms_str);
	var rhythms_a = rhythms_str.split(' ');

	// Generate the abc string
	var ts = r_to_ts(rhythms_a);
	var abc_str = input_r_to_abc_str(rhythms_str, ts, 4);

	// Update hidden rhythms textarea
	$('#' + out_id).val(abc_str);

	// Update rhythms canvas
	var notes_editor = update_editor(out_id, "rhythm_canvas", "rhythm_midi", "rhythm_midi_dl", 350);
};

// TIME SIGNATURE CALCULATIONS //
// =========================== //

// Takes an array of rhythm values (ex.: ['4', '8', '16']).
// Return a time signature (ex.: [4,4]).
function r_to_ts(rhythms_array) {
	var length = r_arr_to_length(rhythms_array);
	var ts = length_to_ts(length)
	ts = divide_ts(ts);
	return ts;
};

// Takes an array of rhythm values (ex.: ['4', '8', '16']).
// Returns a note length in beats (ex.: 1.5 for a dotted qn).
function r_arr_to_length(rhythms_array) {
	var length = 0;
	for (var i = 0; i < rhythms_array.length; i++) {
		r = rhythms_array[i];
		length += r_str_to_length(r, 4); // TODO: Make it change depending on the time signature
	};
	return length;
};

// Takes a single rhythm value (ex.: '4' or 4).
// Returns the length in beats (ex.: 1.5 for a dotted qn).
function r_to_length(rhythm, ts_den) {
	if (ts_den === undefined) {
        ts_den = 4;
    };
    r_str = '' + rhythm; // Cast to string
    var length = r_str_to_length(r_str, ts_den);
    return length;
};

// Takes a single rhythm string (ex.: '4.').
// Returns the length in beats (ex.: 1.5).
function r_str_to_length(rhythm_str, ts_den) {
	tuplet_re = /.*:(\d+)$/;

	if (rhythm_str == '3') rhythm_str = '4.';
	if (rhythm_str == '6' || rhythm_str == '7') rhythm_str = '8.';
	if (rhythm_str == '11') rhythm_str = '16.';
	
	if (rhythm_str[rhythm_str.length - 1] == '.') {
		var rhythm_value = parseInt(rhythm_str);
		var rhythm_float = rhythm_value * 2/3;
	} else {
		rhythm_float = parseFloat(rhythm_str);
	};
	
	var length_in_beats = ts_den / rhythm_float;
	return length_in_beats;
};

// Takes a note length in beats (ex.: 1.5 for a dotted qn).
// Returns a time signature (ex.: [4,4]).
function length_to_ts(length) {
	var num = length;
	var den = 4;
	var decimals = length - parseInt(length);
	if (decimals > 0.0) {
		var multiplier = 2;
		while(((decimals * multiplier) - parseInt(decimals * multiplier)) != 0.0) {
			multiplier = multiplier * 2;
		};
		num = num * multiplier;
		den = den * multiplier;
	};
	var ts = [parseInt(num), parseInt(den)];
	return ts;
};

// Takes a time signature (ex.: [8,4]).
// Returns another time signature that is a
// subdivision of it, either ternary or binary
// when it applies (ex.: [4,4]).
function divide_ts(ts) {
	var feel = 4
	if (ts[0] % 4 != 0 && ts[0] % 3 != 0 || ts[0] == ts[1]) {
		return ts;
	} else if (ts[0] % 3 == 0) {
		feel = 3;
	} else if (ts[0] % 4 == 0) {
		feel = 4;
	};
	var num = ts[0] / (ts[0] / feel);
	var new_ts = [num, ts[1]];
	return new_ts;
};

// STRING MANIPULATIONS //
// ==================== //

// Takes an input rhythm string (ex.: '4 8 8 4 4 4 4 4 8 8 4').
// Returns a complete abcjs string ready to use.
// (Ex.: 'L: 1\nK: perc stafflines=1\nM:3/4\nB/4 B/8B/8 B/4| B/4 B/4 B/4| \nB/4 B/8B/8 B/4').
function input_r_to_abc_str(input_r, ts, n_bars_break) {
	var n_str = input_r_to_n_str(input_r);
	abc_str = format_abc_str(n_str, ts, n_bars_break); // Take care of beams, barlines & line breaks
	abc_str = "L: 1\nK: perc stafflines=1\nM:" + ts[0] + '/' + ts[1] + '\n' + abc_str;
	return abc_str;
};

// Takes an abcjs valid string with notes (but no extra info) (ex.: 'B/4 B/8 B/16'),
// a time signature (ex.: [4,4]), and the number of bars to consider for line breaks.
// Returns a formatted abcjs string complete with barlines and line breaks.
function format_abc_str(n_str, ts, n_bars_break) {
	// The order of operations here is crucial!
	// TODO: make it less so (bug prone)
	var matrix = abc_str_to_full_matrix(n_str, ts);
	var abc_str = add_barlines(ts, n_str);
	abc_str = adjust_beams(abc_str);
	abc_str = line_break_every_n_bars(abc_str, matrix, n_bars_break);
	return abc_str
};

// Takes an input rhythm string (ex.: '4 8 16').
// Returns an abcjs valid string with notes (ex.: 'B/4 B/8 B/16').
function input_r_to_n_str(input_r) {
	var n_str = input_r.replace(/^|\D+/g, ' B/').slice(1); // Add "B/" before each number
	return n_str;
};

// Takes a complete generated loop string, its title, bpm and ts.
// Returns a modified string with its intro text (title info etc.).
function add_intro_to_abc_str(title, bpm, xp_abc, ts) {
	var abc_intro = "";
	if (title !== undefined || title === "") {
		abc_intro += "T: " + title + "\n";
	};
	abc_intro += "L: 1\n";
	if (bpm !== undefined || bpm === "") {
		abc_intro += "\nQ: " + bpm + "\n";
	};
	abc_intro += "M: " + ts[0] + "/" + ts[1] + "\n";

	var abc_str = "||: " + xp_abc + ":||";
	return abc_str;
};

// HELPERS //

// Takes an input string (ex.: 'C/4 D/8' or '4 8').
// Returns a cleaned up string with no trailing space
// and all separators replaced with spaces.
function clean_input_str(str) {
	str = str.replace(/[-,;:\']+/g, ' '); // Replace separators with space
	str = removeTrailingSpace(str); // Remove trailing spaces
	return str;
};

// Takes a string (ex.: 'String ').
// Returns a string with trailing spaces (ex.: 'String').
function removeTrailingSpace(str) {
	return str.replace(/^\s+|\s+$/g, ''); // Remove trailing spaces
};

// Takes a string, a substring to find in it,
// and the nth occurence (0-indexed) of the substring in the string,
// of which we want to get the position in the string.
// Returns the index of that substring in the string.
function getPosition(string, subString, n) {
	return string.split(subString, n).join(subString).length;
};

// Takes a single note string (ex.: 'A')
// and a single rhythm string (ex.: '4').
// Returns an abc-formatted string (ex.: 'A/4').
// TODO: convert dotted notes and triplets.
function note_rhythm_to_abc(note_str, rhythm_str) {
	return note_str + '/' + rhythm_str
};

// XP GENERATION //
// ============= //

// Takes an array of notes (ex.: ['C', 'd'])
// and an array of rhythms (ex.: ['4', '8', '16']).
// Returns an abc-formatted string with the generated loop
// with the notes and rhythms distributed to each other.
// (ex.: "C/4 d/8 C/16 d/4 C/8 d/16").
function make_xp_abc(notes_a, rhythms_a) {
	var xp_a = xp_mix_and_match(notes_a, rhythms_a);
	var xp_abc = xp_to_abc(xp_a);
	return xp_abc;
};

// Takes an array of notes ex.: ['C', 'd']
// and an array of rhythms (ex.: ['4', '8', '16']).
// Returns an array of [note, rhythm] pairs, representing the new loop:
// The notes and rhythms are distributed to each other.
// (ex.: [ ['C', '4'], ['d', '8'], ['C', '16'], ['d', '4'], ['C', '8'], ['d', '16'] ]).
function xp_mix_and_match(notes_a, rhythms_a) {
	var note = [notes[0], rhythms[0]];
	var xp = [note];
	var notes_i = 0;
	var rhythms_i = 0;
	while(true) {
		notes_i = (notes_i + 1) % notes.length;
		rhythms_i = (rhythms_i + 1) % rhythms.length;
		note = [notes[notes_i], rhythms[rhythms_i]];
		if (notes_i == 0 && rhythms_i == 0) {
			break;
		};
		xp.push(note);
	};
	return xp;
};

// Takes an xp array.
// (ex.: [ ['C', '4'], ['d', '8'], ['C', '16'], ['d', '4'], ['C', '8'], ['d', '16'] ]).
// Returns an abc-formatted string.
// (ex.: "C/4 d/8 C/16 d/4 C/8 d/16").
function xp_to_abc(xp) {
	var abc_str = "";
	for (var i = 0; i < xp.length; i++) {
		evt = xp[i];
		note_rhythm = note_rhythm_to_abc(evt[0], evt[1]);

		abc_str += note_rhythm + " ";
	};

	return abc_str;
};

// BAR MANIPULATIONS //
// ================= //

// Takes an abc-formatted string with no intro text
// (ex.: "C/4 d/8 E/16"), its matrix and the n number
// of bars before every line break.
// Returns an updated string with line breaks.
// TODO: NOT REQUIRE A MATRIX GENERATED BEFORE STRING WAS FORMATTED (BUG PRONE)
function line_break_every_n_bars(abc_str, matrix, n) {
	var indexes = get_each_nth_bars(n, matrix);
	for (var i = 0; i < indexes.length; i++) {
		var position = getPosition(abc_str, ' ', indexes[i]);
		abc_str = abc_str.substr(0, position) + ' \n' + abc_str.substr(position + 1, abc_str.length);
	};
	return abc_str;
};

// Takes an abc-formatted string with no intro text
// (ex.: "C/4 d/8 E/16") and the n number
// of notes before every line break.
// Returns an updated string with line breaks.
function line_break_every_n_notes(notes_str, n) {
	var notes_a = notes_str.split(/[ ]+/);

	if (notes_a.length >= n) {
		var new_str = notes_str;

		for (var i = n; i < notes_a.length; i += n) {
			var position = getPosition(notes_str, ' ', i);
			new_str = new_str.substr(0, position) + '0' + new_str.substr(position + 1, new_str.length);
		};

		notes_str = new_str.replace(/[0]+/g, '\n');
	};

	return notes_str;
};

// Takes an abc-formatted string with no intro text
// (ex.: "C/4 d/8 E/16") and its time signature (ex.: [4,4]).
// Returns an updated string with bar lines.
function add_barlines(abc_str, ts) {
	var rhythms = rhythm_from_abc(abc_str); // make list of rhythms out of the string
	current_bar = 0;
	for (var i = 0; i < rhythms.length - 1; i++) { // - 1 to avoid getting a bar line at the end
		current_bar +=  rhythm_to_length(rhythms[i], ts[1]); // convert rhythm to make sense with ts den
		if (current_bar >= ts[0]) {
			var j = getPosition(abc_str, ' ', i+1); // find the position of the note in the string
			abc_str = abc_str.substring(0, j) + '|' + abc_str.substring(j, abc_str.length); // add bar line
			current_bar -= ts[0]; // reset length
		};
	};
	return abc_str;
};

// Takes an abc-formatted string with no intro text (ex.: "C/4 d/8 E/16 E/16 C/4").
// Returns an updated string with adjusted beams per beat (ex.: "C/4 d/8E/16E/16 C/4").
function adjust_beams(abc_str) {
	var rhythms = rhythm_from_abc(abc_str); // make list of rhythms out of the string
	abc_str = abcjs_str.replace(/[ ]+/g, '0');
	current_beat = 0;
	var new_str = abc_str;
	for (var i = 0; i < rhythms.length; i++) {
		r_length = rhythm_to_length(rhythms[i]); // convert rhythm to make sense with ts den
		current_beat += r_length;
		if (current_beat <= 1 && i > 0 && current_beat > r_length) {
			j = getPosition(abc_str, '0', i);
			new_str = new_str.substr(0,j) + '%' + new_str.substr(j+1,new_str.length);
		};
		if (current_beat >= 1) {
			current_beat = 0; // reset length
		};
	};
	new_str = new_str.replace(/[0]+/g, ' ');
	new_str = new_str.replace(/[%]+/g, '');
	return new_str;
};

// HELPERS

// Takes an int n number of bars and a matrix.
// Returns an array containing the index of the beginning of those nth bars.
function get_each_nth_bars(n, matrix) {
	var indexes = [];
	for (var i = 0; i < matrix[0].length; i++) {
		if (matrix[3][i] % (n+1) == 0 && matrix[4][i] == 1) {
			indexes.push(i);
		};
	};
	return indexes;
};

// PARSING //
// ======= //

// Takes an abc-formatted string with no intro text
// (ex.: "C/4 d/8 E/16") and its time signature (ex.: [4,4]).
// Returns an array of aligned values :
// [[notes], [rhythms], [time signatures], [bar numbers], [beat numbers]].
// /!\ Bar and beat numbers are 1-indexed for consistency with music theory.
function abc_str_to_full_matrix(abc_str, ts) {
	var notes = notes_from_abc(abc_str);
	var rhythms = rhythm_from_abc(abc_str);
	var bar_nrs = [];
	var beat_nrs = [];

	var length = 0;
	var bar_nr = 1;
	var beat_nr = 0;
	for (var i = 0; i < rhythms.length; i++) {
		beat_nrs.push(beat_nr + 1);
		bar_nrs.push(bar_nr);
		beat_nr += rhythm_to_length(rhythms[i], ts[1]);
		if (beat_nr >= ts[0]) {
			beat_nr -= ts[0];
			bar_nr++;
		};
	};

	return [notes, rhythms, ts, bar_nrs, beat_nrs]
};

// HELPERS

// Take an option string ("beat" or "bar"),
// an abc-formatted string with no intro text (ex.: "C/4 d/8 E/16"),
// the index of the note to lookup,
// and the time signature.
// Returns current place in the current bar
// (ex.: 1, 2, 3, 3.5) if option == "beat".
// Returns current bar number (ex.: 1, 2, 3, 4)
// if option === "bar".
function get_nr(option, abc_str, index, ts) {
	if (ts === undefined) {
        ts = [4,4];
    };
    if (option === undefined) {
    	option = "beat";
    };

	var matrix = abc_str_to_full_matrix(abc_str, ts);
	var rhythms = matrix[1];

	var length = 0;
	var bar_nr = 0;
	for (var i = 0; i < index; i++) {
		length += rhythm_to_length(rhythms[i], ts[1]);
		if (length >= ts[0]) {
			length -= ts[0];
			bar_nr++;
		};
	};
	if (option == "beat") {
		return length;
	} else if (option == "bar") {
		return bar_nr;
	};
};

// Takes an abc-formatted string with no intro text (ex.: "C/4 d/8 E/16").
// Returns an array with only the rhythm strings from that string (ex.: ['4', '8', '16']).
function rhythm_from_abc(abc_str) {
	abc_str = removeTrailingSpace(abc_str);
	abc_str = abc_str.replace(/[ ]+/g, '0'); // replace spaces with 0's
	abc_str = abc_str.replace(/[\D]+/g, ''); // remove non-digits
	var rhythms_a = abc_str.split('0');
	return rhythms_a;
};

// Takes an abc-formatted string with no intro text (ex.: "C/4 d/8 E/16").
// Returns an array with only the note strings from that string (ex.: ['C', 'd', 'E']).
function notes_from_abc(abc_str) {
	abc_str = removeTrailingSpace(abc_str); // clean up
	abc_str = abc_str.replace(/[^A-GZ-z]+/g, '0'); // remove non-notes
	if (abc_str[0] == '0') {
		abc_str = abc_str.substr(1, abc_str.length);
	};
	// clean up
	if (abc_str[abc_str.length-1] == '0') {
		abc_str = abc_str.substr(0, abc_str.length-1);
	};
	var notes_a = abc_str.split('0');
	return notes_a;
};

// DISPLAY //
// ======= //

// Takes the id string of the editor textarea,
// the id string of the canvas to update,
// the id string of the div containing the midi embed,
// the id string of the div containing the midi download link,
// and the width of the canvas.
// Returns a new ABCJS.Editor object, thereby updating the canvas.
function update_editor(textarea_id, canvas_id, midi_id, midi_dl_id, width) {
	return new ABCJS.Editor(textarea_id, { canvas_id: canvas_id,
								 		   midi_id: midi_id,
								 		   midi_download_id: midi_dl_id,
								 		   midi_options: {
								 		 	  generateDownload:"true",
								 		 	  downloadLabel:"Download %T.mid"
								 		   },
								 		   warnings_id: "warnings",
								 		   render_options: get_canvas_dim(canvas_id, width),
								 		   parser_params: {},
								 		   generate_midi: true,
								 		   generate_warnings: false
										   });
};

// Takes the id string of a canvas and its width.
// Returns the render_options for the canvas to scale.
function get_canvas_dim(canvas_id, width) {
	var w = $('.collapsible').width();
	//var e = $('#' + canvas_id).width();
	var e = sw/4;
	//console.log("w = " + w);
	//console.log("e = " + e);
	var sw = width;
	var scale = 1.0;
	
	var arealeft = w - e;
	//console.log("arealeft = " + arealeft);
	if (arealeft < (sw + (sw/3))) {
		scale = scale * (arealeft - 50)/ sw;
		sw = arealeft - 50;			
		//console.log("scale = " + scale);
		//console.log("sw = " + sw);
	};

	$('#paperid').width = sw;
	return {staffwidth: sw, scale: scale};
};