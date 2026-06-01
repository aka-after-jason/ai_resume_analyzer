import {Link} from "react-router";

/**
 * 自定义组件
 * const Navbar = () => {
 *     return (
 *      <div>NavBar</div>
 *     )
 * }
 *
 * export default Navbar
 */
const Navbar = () => {
    return (
        <nav className={"navbar"}>
            <Link to={"/"}>
                <p className={"text-2xl font-bold text-gradient"}>RESUMIND</p>
            </Link>
            <Link to={"/upload"}  className={"primary-button w-fit"}>
                Upload Resume
            </Link>
        </nav>
    )
}

export default Navbar