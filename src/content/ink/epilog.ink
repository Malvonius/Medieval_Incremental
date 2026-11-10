// Interaktiver Epilog nach einem Ende. Variablen setzt das Spiel vor dem Start.
VAR ending = "light"
VAR trust_sera = false
VAR trust_ilse = false
VAR ng_plus = 0

{ ending == "light": -> licht | -> asche }

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
