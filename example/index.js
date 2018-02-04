const add = (a, b) => a + b;

const Button = props => {
  return (
    <button onClick={props.onClick} disabled={props.disabled}>
      {props.text}
    </button>
  );
};
