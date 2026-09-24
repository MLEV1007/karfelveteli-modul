-- A "Jármű állapota" mező MEGBONTATLAN opcióját MOZGASKEPTELEN-re nevezzük át
-- (a felhasználói felületen "Mozgásképes" / "Mozgásképtelen" jelenjen meg,
-- a korábbi "Megbontatlan" helyett). ALTER TYPE ... RENAME VALUE a meglévő
-- sorokban lévő értéket automatikusan átvezeti, adatvesztés nélkül.
ALTER TYPE "VehicleCondition" RENAME VALUE 'MEGBONTATLAN' TO 'MOZGASKEPTELEN';
