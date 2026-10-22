-- Custom places: besides a business from the map, a host can type a place in, as a title
-- ("Ee's place") with an optional address. The title is public like any plan detail; the
-- address is only shown to people in the plan. Vote options keep the address in `note`.
alter table plans add column if not exists venue_address text;
