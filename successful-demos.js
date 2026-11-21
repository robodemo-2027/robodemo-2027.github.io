export function successfulHumanCases(data) {
  return (data.tasks || []).filter(task => {
    const record = data.evidence?.cases?.find(item => item.trial_id === task.trial);
    return task.withSuccess === true && record?.with_demo_success === true
      && record.human_reference === task.reference
      && Number.isFinite(task.firstSuccess)
      && Math.round(task.firstSuccess * task.fps) === record.with_demo_first_success_step;
  });
}

export function successfulRetrievedCases(rows, evidence) {
  return rows.filter(row => {
    const record = evidence.records.find(item => item.trial_id === row.execution?.trial_id);
    return row.execution?.success === true && record?.success === true
      && record.success_at_end === true && record.trajectory_terminal_success === true
      && record.trajectory_complete === true && record.trajectory_steps === record.horizon
      && record.status === 'completed' && record.reference_type === 'robot'
      && record.reference_uid === row.reference?.uid
      && record.recorded_steps === row.execution.steps && record.horizon === row.execution.steps;
  });
}
