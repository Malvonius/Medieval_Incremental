// Interactive epilogue after an ending. The game sets the variables before starting.
VAR ending = "light"
VAR trust_sera = false
VAR trust_ilse = false
VAR ng_plus = 0

{ ending:
- "light": -> light
- "ash": -> ash
- "concord": -> concord
- else: -> awakening
}

=== light ===
The snow melts in Vhal. For the first time in years the wind smells of earth instead of ash.
{ trust_sera: Sera stands at the gate, sword in its sheath. She has not drawn it since the siege. }
{ trust_ilse: Ilse Varn has left the tower. On her table lies only a note: "Thank you for believing me." }
+ [Visit Brannoc's grave] -> brannoc
+ [Ring the bell one last time] -> bell

= brannoc
On the hill above the forge lies a plain stone. Someone has chiselled a hammer into it.
You lay the first blade he ever forged for you beside it. It is notched and heavy.
-> closing

= bell
The tone rolls across the fields as far as Grauweiler. No one answers. For the first time, that is good news.
-> closing

= closing
{ ng_plus > 0: You feel you have lived this spring {ng_plus + 1} times already. It doesn't grow more beautiful. It grows more precious. }
Vhal is free.
-> END

=== ash ===
The stone throbs in your hand. Beneath the castle ten thousand dead await a word from you.
{ trust_ilse: Ilse kneels before you. "Master," she says, and this time it sounds like a promise. }
{ trust_sera: Sera is gone. Where she stood, her sword lies in the snow. }
+ [Command the dead to rest] -> rest
+ [Command the dead to march] -> march

= rest
They lie down, one after another. Only one remains standing and looks at you – an old man in white vestments.
"You will become like me," he says. "It just takes longer."
-> END

= march
The dead turn east. Beyond the horizon lies a kingdom that has never heard of Vhal.
Soon it will.
-> END

=== concord ===
In the market square the new fountain splashes. A bishop, a count and a peasant argue over who paid for it.
{ trust_sera: Sera mediates. She has the patience of a saint and a very large sword. }
+ [Settle the quarrel] -> settle
+ [Watch and eat bread] -> bread

= settle
You explain that you paid for it. All three agree at once that this cannot be true. Concord, at last.
-> END

= bread
The bread is good. The quarrel lasts until vespers. Nobody dies. For Vhal that is a feast day.
-> END

=== awakening ===
The ash lies still. For the first time you feel no pull back to the beginning.
{ ng_plus > 0: For {ng_plus + 1} lifetimes you saved and burnt this land. This time you may simply stay. }
+ [Stay] -> stay
+ [Move on] -> moveon

= stay
You plant an apple tree beside Brannoc's grave. You will see it bear fruit.
-> END

= moveon
You take nothing but a walking staff. Behind you the bell tolls though no one pulls it.
-> END
