import { useState, useEffect } from "react";
import {useNavigate } from "react-router-dom";
import "../styles/App.css";
import Modal from "../components/Modal";
import { ToastContainer } from "react-toastify";

function App() {
  const [modalOpen, setModalOpen] = useState(false);
const navigate = useNavigate();

 // ✅ Check if already authenticated
 useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
         
          navigate("/dashboard");
         
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkAuth();
  }, [navigate]);


  return (
    <div className="App">
        <ToastContainer position="top-right" autoClose={3000} />
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas eleifend, dui ut consequat auctor, 
        dui ex consequat purus, vitae scelerisque nunc purus id lorem. Proin pellentesque et diam ac ultrices. 
        Aenean rutrum at nibh et pellentesque. Aenean porta vel est in scelerisque. Nam in venenatis nibh, nec 
        ultrices lorem. Vivamus semper orci vel mi finibus, egestas tempus libero maximus. Aenean ornare diam id
         vestibulum venenatis. Nulla non condimentum turpis. Vestibulum hendrerit lectus quis magna placerat,
          a pharetra diam rutrum.

          Duis vitae libero quis nisi placerat placerat. Donec eu sagittis velit, nec posuere risus. 
          Interdum et malesuada fames ac ante ipsum primis in faucibus. Vestibulum suscipit nunc est, 
          vel fermentum ex bibendum a. Nulla facilisis lacus sit amet congue vehicula. Donec interdum, 
          enim eget lacinia feugiat, lacus justo sollicitudin diam, in gravida lorem felis ac odio. 
          Sed in sodales lorem.

          Etiam lacinia luctus justo. In scelerisque volutpat leo, vitae aliquet nisi consectetur et.
          Curabitur maximus, neque ut vestibulum accumsan, libero mauris vehicula urna,
          id eleifend arcu magna in justo. Duis faucibus bibendum nisl id vestibulum. 
          Morbi quis rutrum felis, vel malesuada metus. Maecenas mauris quam, maximus eu 
          laoreet at, cursus et felis. Nulla aliquam lorem at massa dignissim blandit. 
          Sed eu ex ac diam egestas condimentum quis eget urna. Nunc porta bibendum dui 
          a imperdiet.

          Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. 
          Phasellus ac ipsum egestas, porttitor turpis sit amet, vulputate nisl. Donec eu gravida ligula.
          Donec sodales erat vitae dui iaculis, at semper urna varius. Aliquam a erat efficitur,
            sagittis urna at, scelerisque est. Donec consectetur bibendum efficitur. 
            Ut volutpat tellus sed neque tempus cursus. In mattis aliquet nibh sit amet efficitur. 
            Etiam tempus nibh semper elit viverra pretium. Fusce et vehicula enim. Phasellus eget justo venenatis, 
            luctus nisl ullamcorper, finibus lacus. Mauris quis lorem fringilla, malesuada nibh vitae, 
            malesuada dolor. Fusce blandit quam vel massa auctor egestas. Praesent volutpat mi nibh, 
            sed suscipit dui tristique a. Aliquam dapibus dui justo, quis tristique sem posuere id. 
            Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.

          Nam tempus erat augue, et porta dolor efficitur eget. Nullam non est dictum, aliquam turpis et, 
          ultrices eros. Sed magna metus, aliquet pellentesque rhoncus nec, malesuada vitae ligula. 
          Suspendisse potenti. Sed porttitor id magna sed ornare. Vestibulum elementum placerat turpis, i
          n vestibulum ligula dictum ornare. Morbi bibendum mollis diam interdum rutrum. Quisque lacinia aliquet eros, 
          a vulputate urna pharetra ac. Curabitur ac tristique odio. Praesent sit amet lorem tempor, maximus nulla tempus,
          laoreet enim.
    </p>
      <button
        className="openModalBtn"
        onClick={() => {
          setModalOpen(true);
        }}
      >
        Start
      </button>

      {modalOpen && <Modal setOpenModal={setModalOpen} />}
   
    </div>
  );
}

export default App;