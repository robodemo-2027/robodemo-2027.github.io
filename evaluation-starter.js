export const checkpointSteps = Object.freeze({
  full50: 240000, c15: 90000, c30: 160000, c45: 260000, 'c15-wo': 100000,
});

export function evaluationCommand({model = 'c15', gpus = '1', memory = '32', plan = 'smoke'} = {}) {
  if (!Object.hasOwn(checkpointSteps, model) || !['1', '8'].includes(gpus)
      || !['32', '80'].includes(memory) || !['smoke', 'full'].includes(plan)) {
    throw new RangeError('Choose a released checkpoint, GPU count, memory preset and evaluation scale.');
  }
  const devices = gpus === '1' ? '0' : '0,1,2,3,4,5,6,7';
  const launcher = gpus === '1' ? 'single' : '8gpu';
  const workers = memory === '80' ? 2 : 1;
  const limit = plan === 'smoke' ? ` --max-episodes ${Number(gpus) * workers}` : '';
  return `export MODEL=${model}
export CUDA_VISIBLE_DEVICES=${devices}

hf download "mxk1998/RoboDemo-\${MODEL}" \\
  pytorch_model.pt policy.yaml normalization.json \\
  --local-dir "checkpoints/RoboDemo-\${MODEL}" &&

python environments/check_environment.py --assets \\
  --output "outputs/\${MODEL}-environment.json" &&

bash "scripts/evaluate/\${MODEL}-${launcher}.sh" \\
  --checkpoint "checkpoints/RoboDemo-\${MODEL}/pytorch_model.pt" \\
  --data-root "$ROBODEMO_DATA_ROOT" \\
  --workers-per-gpu ${workers}${limit} \\
  --output "outputs/\${MODEL}-${gpus}gpu-${workers}worker-${plan}"`;
}

export function initEvaluationStarter() {
  const form = document.querySelector('#evaluation-starter');
  if (!form) return;
  const command = form.querySelector('#starter-command');
  const copy = form.querySelector('#starter-copy');
  const message = form.querySelector('#starter-status');
  function update() {
    const model = form.querySelector('#starter-model').value;
    const gpus = form.querySelector('#starter-gpus').value;
    const memory = form.querySelector('#starter-memory').value;
    const plan = form.querySelector('#starter-plan').value;
    const workers = memory === '80' ? 2 : 1;
    command.textContent = evaluationCommand({model, gpus, memory, plan});
    form.querySelector('#starter-weights').href = `https://huggingface.co/mxk1998/RoboDemo-${model}`;
    const count = plan === 'smoke' ? Number(gpus) * workers : (model === 'full50' ? 2000 : 400);
    message.textContent = `${count.toLocaleString('en-US')} episode${count === 1 ? '' : 's'} total, 500 steps each; ${workers} worker${workers === 1 ? '' : 's'}/GPU.`;
  }
  form.addEventListener('change', update);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(command.textContent);
      message.textContent = 'Commands copied. Run them in your configured RoboDemo checkout.';
    } catch {
      message.textContent = 'Select the commands below and copy them manually.';
      command.focus();
    }
  });
  update();
}
