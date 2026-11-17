// Interaktiver Epilog nach einem Ende. Variablen setzt das Spiel vor dem Start.
VAR ending = "light"
VAR trust_sera = false
VAR trust_ilse = false
VAR ng_plus = 0

{ ending:
- "light": -> licht
- "ash": -> asche
- "concord": -> eintracht
- else: -> erwachen
}

=== licht ===
Der Schnee schmilzt in Vhal. Zum ersten Mal seit Jahren riecht der Wind nach Erde statt nach Asche.
{ trust_sera: Sera steht am Tor, das Schwert in der Scheide. Seit der Belagerung hat sie es nicht mehr gezogen, und sie scheint es nicht zu vermissen. }
{ trust_ilse: Ilse Varn hat den Turm verlassen. Auf ihrem Tisch liegt nur ein Zettel: „Danke, dass Ihr mir geglaubt habt.“ }
+ [Zum Grab Brannocs gehen] -> brannoc
+ [Die Glocke ein letztes Mal läuten] -> glocke

= brannoc
Auf dem Hügel über der Schmiede liegt ein schlichter Stein. Jemand hat einen Hammer hineingemeißelt.
Du legst die erste Klinge daneben, die er für dich geschmiedet hat. Sie ist schartig und schwer.
-> ausklang

= glocke
Der Ton rollt über die Felder bis nach Grauweiler. Niemand antwortet, und zum ersten Mal ist das eine gute Nachricht.
-> ausklang

= ausklang
{ ng_plus > 0: Dir ist, als hättest du diesen Frühling schon {ng_plus + 1}-mal erlebt. Schöner wird er nicht, aber wertvoller. }
Vhal ist frei.
-> END

=== asche ===
Der Stein pocht in deiner Hand. Unter der Burg warten zehntausend Tote auf ein Wort von dir.
{ trust_ilse: Ilse kniet vor dir. „Meister“, sagt sie, und diesmal klingt es wie ein Gelübde. }
{ trust_sera: Sera ist gegangen. An der Stelle, wo sie stand, liegt ihr Schwert im Schnee. }
+ [Den Toten befehlen, zu ruhen] -> ruhe
+ [Den Toten befehlen, zu marschieren] -> marsch

= ruhe
Sie legen sich nieder, einer nach dem anderen. Nur einer bleibt stehen und sieht dich an – ein alter Mann in weißem Ornat.
„Ihr werdet wie ich“, sagt er. „Es dauert nur ein wenig länger.“
-> END

= marsch
Die Toten wenden sich nach Osten. Hinter dem Horizont liegt ein Königreich, das noch nie von Vhal gehört hat.
Bald wird es von Vhal hören. Sehr bald.
-> END

=== eintracht ===
Auf dem Marktplatz plätschert der neue Brunnen. Ein Bischof, ein Graf und ein Bauer streiten darüber, wer ihn bezahlt hat.
{ trust_sera: Sera schlichtet. Sie hat dafür eine Engelsgeduld und ein sehr großes Schwert. }
+ [Den Streit schlichten] -> schlichten
+ [Zusehen und Brot essen] -> brot

= schlichten
Du erklärst, dass du ihn bezahlt hast. Alle drei sind sich sofort einig, dass das nicht stimmen kann. Eintracht, endlich.
-> END

= brot
Das Brot ist gut. Der Streit dauert bis zur Vesper. Niemand stirbt. Für Vhal ist das ein Festtag.
-> END

=== erwachen ===
Die Asche liegt still. Zum ersten Mal spürst du keinen Sog zurück an den Anfang.
{ ng_plus > 0: {ng_plus + 1} Leben lang hast du dieses Land gerettet und verbrannt. Dieses Mal darfst du einfach bleiben. }
+ [Bleiben] -> bleiben
+ [Weiterziehen] -> weiter

= bleiben
Du pflanzt einen Apfelbaum neben Brannocs Grab. Du wirst sehen, wie er Früchte trägt.
-> END

= weiter
Du nimmst nur einen Wanderstab mit. Hinter dir läutet die Glocke, ohne dass jemand sie zieht.
-> END
