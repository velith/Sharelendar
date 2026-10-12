// Runs once before all test workers start; workers inherit this env,
// so date/time tests are deterministic regardless of the machine's time zone.
module.exports = () => {
  process.env.TZ = 'UTC';
};

