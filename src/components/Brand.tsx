import { Link } from "react-router-dom";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="LitYourWit home">
      <img
        className="brand-logo"
        src="/brand/lityourwit-logo.png"
        alt=""
        width="49"
        height="49"
      />
      <span>
        LitYourWit<small>BOOK CLUB</small>
      </span>
    </Link>
  );
}
