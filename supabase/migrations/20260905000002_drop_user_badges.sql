-- Migration: Drop redundant user_badges table and update badge progress calculation function

-- Drop the user_badges table (its functionality is completely superseded by user_badge_progress)
drop table if exists public.user_badges cascade;

-- Update calculate_user_badge_progress to remove the redundant write to user_badges
create or replace function public.calculate_user_badge_progress(
  p_user_id uuid,
  p_badge record
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_item jsonb;
  v_tag_id text;
  v_threshold int;
  v_tag_count int;
  v_total_current int := 0;
  v_total_target int := 0;
  v_all_criteria_met boolean := true;
  v_progress_breakdown jsonb := '[]'::jsonb;
  v_now timestamptz := timezone('utc'::text, now());
  v_is_already_unlocked boolean := false;
  v_existing_acquired_at timestamptz := null;
  v_existing_is_pinned boolean := false;
begin
  -- Check existing progress and unlock state
  select is_unlocked, acquired_at, is_pinned
  into v_is_already_unlocked, v_existing_acquired_at, v_existing_is_pinned
  from public.user_badge_progress
  where user_id = p_user_id and badge_id = p_badge.id;

  -- Process criteria_data formatted as array of 2-length tuples: [[tag_id, threshold], ...]
  if jsonb_typeof(p_badge.criteria_data) = 'array' then
    for v_item in select * from jsonb_array_elements(p_badge.criteria_data)
    loop
      v_tag_id := v_item->>0;
      v_threshold := coalesce((v_item->>1)::int, 1);

      if v_tag_id = '*' or p_badge.criteria_type = 'total_visits' then
        select count(distinct location_id) into v_tag_count
        from public.location_visits
        where user_id = p_user_id;
      else
        select count(distinct lv.location_id) into v_tag_count
        from public.location_visits lv
        join public.location_tags lt on lt.location_id = lv.location_id
        where lv.user_id = p_user_id
          and lt.tag_id = v_tag_id;
      end if;

      v_total_target := v_total_target + v_threshold;
      v_total_current := v_total_current + least(v_tag_count, v_threshold);

      if v_tag_count < v_threshold then
        v_all_criteria_met := false;
      end if;

      v_progress_breakdown := v_progress_breakdown || jsonb_build_object(
        'tag_id', v_tag_id,
        'current', v_tag_count,
        'target', v_threshold
      );
    end loop;
  else
    -- Fallback compatibility for legacy object format {"threshold": N, "tag_id": "..."}
    v_threshold := coalesce((p_badge.criteria_data->>'threshold')::int, 1);
    v_tag_id := p_badge.criteria_data->>'tag_id';
    v_total_target := v_threshold;

    if v_tag_id is not null and p_badge.criteria_type = 'tag_visits' then
      select count(distinct lv.location_id) into v_tag_count
      from public.location_visits lv
      join public.location_tags lt on lt.location_id = lv.location_id
      where lv.user_id = p_user_id
        and lt.tag_id = v_tag_id;
    else
      select count(distinct location_id) into v_tag_count
      from public.location_visits
      where user_id = p_user_id;
    end if;

    v_total_current := least(v_tag_count, v_threshold);
    v_all_criteria_met := (v_tag_count >= v_threshold);
    v_progress_breakdown := jsonb_build_array(jsonb_build_object(
      'tag_id', coalesce(v_tag_id, '*'),
      'current', v_tag_count,
      'target', v_threshold
    ));
  end if;

  if v_total_target <= 0 then
    v_total_target := 1;
  end if;

  -- Once unlocked, retain unlocked state and timestamp
  if coalesce(v_is_already_unlocked, false) or v_all_criteria_met then
    v_all_criteria_met := true;
    v_total_current := v_total_target;
    if v_existing_acquired_at is null then
      v_existing_acquired_at := v_now;
    end if;
  end if;

  insert into public.user_badge_progress (
    user_id,
    badge_id,
    current_progress,
    target_progress,
    progress_percentage,
    is_unlocked,
    is_pinned,
    acquired_at,
    progress_data,
    updated_at
  )
  values (
    p_user_id,
    p_badge.id,
    v_total_current,
    v_total_target,
    round((v_total_current::numeric / v_total_target::numeric) * 100, 2),
    v_all_criteria_met,
    coalesce(v_existing_is_pinned, false),
    v_existing_acquired_at,
    v_progress_breakdown,
    v_now
  )
  on conflict (user_id, badge_id) do update set
    current_progress = excluded.current_progress,
    target_progress = excluded.target_progress,
    progress_percentage = excluded.progress_percentage,
    is_unlocked = excluded.is_unlocked,
    acquired_at = coalesce(public.user_badge_progress.acquired_at, excluded.acquired_at),
    progress_data = excluded.progress_data,
    updated_at = excluded.updated_at;
end;
$$;
